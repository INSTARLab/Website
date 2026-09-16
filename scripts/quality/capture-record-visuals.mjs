#!/usr/bin/env node
// All-page Record capture pipeline (RRP-201, GitLab #26).
//
// Captures full-page screenshots + AVIF thumbnails for EVERY ledger page
// derived from the production `dist/` build (ordinary pages, generated pages,
// all Record routes, the noindex error document, and the noindex search
// utility) — not a representative sample. The route population is read off the
// artifact with the same classifier as
// `scripts/quality/canonical-route-ledger.mjs`, so route additions/removals
// update coverage automatically.
//
// Two-pass frozen-manifest self-capture contract (no recursive recapture):
//   1. `pnpm run build` produces the frozen input build B1.
//   2. `capture-record-visuals.mjs --capture` freezes the input manifest
//      (routeId -> contentHash over base-normalized HTML), serves B1, and
//      captures each stale/missing route once. Entries whose contentHash is
//      unchanged are carried over byte-identical (deterministic rerun apart
//      from recorded timestamps). Output: committed generation data in
//      `src/data/record-captures.json` + website-facing AVIFs in
//      `public/record/shots/`.
//   3. Rebuild (`pnpm run build`) embeds the new generation into
//      `/record/screens/` (gallery + `data-capture-generation`). The stored
//      capture of `/record/screens/` itself always depicts the PREVIOUS
//      generation's page by design (`selfCapture: true`, `depictsGeneration`);
//      it is never recaptured to chase the build that embeds it, and the
//      coverage gate validates it through the generation chain instead of a
//      contentHash comparison. Adding capture output never invalidates the
//      other routes' captures because their hashes cover HTML only.
//   4. `--check` (dist-only, no browser) re-verifies: every required route has
//      a `success` entry whose contentHash matches the current build, failures
//      keep their detail and can never read as current, and anything behind
//      the build reads as `stale`. `--strict` exits non-zero unless coverage
//      is 100% — that is the CI gate.
//
// Capture quality: waits for fonts + settled media, auto-scrolls through lazy
// sections before shooting, decodes every screenshot and rejects blank ones,
// serves through `serve-dist.mjs` so the capture sees the host's real routing
// contract (including the 404 status of the error document).
//
// Usage:
//   node scripts/quality/capture-record-visuals.mjs --check [--dist dist] [--base /] [--strict]
//   node scripts/quality/capture-record-visuals.mjs --capture [--dist dist] [--base /] [--strict] [--force]

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";
import sharp from "sharp";
import { chromium } from "@playwright/test";
import {
  absolutePath,
  listHtmlFiles,
  openingTags,
  pageMetadata,
  parseArgs,
  printHelp,
  relativeToRepo,
  routeFromHtml,
  readText,
  sha256,
} from "./lib.mjs";

const CAPTURE_CODE_VERSION = 1;
const STATUS = ["success", "failed", "stale"];
const SELF_CAPTURE_ROUTE = "/record/screens/";

const VIEWPORTS = [
  { id: "desktop", width: 1440, height: 900 },
  { id: "mobile", width: 390, height: 844 },
];

const options = parseArgs(process.argv.slice(2), {
  dist: "dist",
  base: process.env.ASTRO_BASE ?? "/",
  data: "src/data/record-captures.json",
  shots: "public/record/shots",
  out: "artifacts/record-capture",
  port: process.env.CAPTURE_PORT ?? "4193",
});

if (options.help) {
  printHelp([
    "Capture all-page Record screenshots for every ledger page.",
    "Usage:",
    "  node scripts/quality/capture-record-visuals.mjs --check [--dist dist] [--base /] [--strict]",
    "  node scripts/quality/capture-record-visuals.mjs --capture [--dist dist] [--base /] [--strict] [--force] [--jobs 3]",
    "",
    "Modes: --check verifies the committed capture generation against a build (no browser).",
    "  --capture recaptures stale/missing routes and writes a new generation (needs a browser).",
    "  --jobs N sizes the browser worker pool (default 3).",
  ]);
  process.exit(0);
}

const mode = options.capture ? "capture" : "check";
const distRoot = absolutePath(options.dist);
const dataPath = absolutePath(options.data);
const shotsRoot = absolutePath(options.shots);
const qaRoot = absolutePath(join(options.out, `run-${Date.now()}`));

if (!existsSync(distRoot)) {
  console.error(`Rendered output not found: ${distRoot}`);
  console.error("Run the Astro production build first, then rerun this pipeline.");
  process.exit(2);
}

function normalizeBase(value) {
  const raw = String(value ?? "/").trim() || "/";
  if (raw === "/") return "/";
  const path = raw.includes("://") ? new URL(raw).pathname : raw;
  const trimmed = path.replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}` : "/";
}

const distBase = normalizeBase(options.base);
const basePrefix = distBase === "/" ? "" : distBase;

// The capture build (base /) and the GitLab Pages build (base /Website/)
// differ only by the base prefix injected into URLs. Normalizing it away
// before hashing lets one generation verify both artifacts; the replacement
// is applied identically to both sides so it cannot equate distinct pages.
function canonicalHtmlForHash(html) {
  return basePrefix ? html.replaceAll(basePrefix, "") : html;
}

function contentHashFor(html) {
  return createHash("sha256").update(canonicalHtmlForHash(html), "utf8").digest("hex");
}

function classify(route, metadata, html) {
  const refresh = openingTags(html, ["meta"]).find(
    ({ attributes }) => attributes["http-equiv"]?.toLowerCase() === "refresh",
  );
  if (refresh) return "alias";
  if (route === "/404.html") return "error";
  if (!metadata.indexable) return "utility";
  if (route.startsWith("/record/")) return "record";
  return "page";
}

function slugFor(routeId) {
  if (routeId === "/") return "home";
  if (routeId === "/404.html") return "404";
  return routeId.replace(/^\/|\/$/g, "").replaceAll("/", "-").toLowerCase();
}

// Every emitted HTML document is a required capture row: ordinary pages,
// Record routes, the error document, and the utility route. Alias documents
// (none today) resolve to their canonical route instead of being captured
// twice or silently excluded.
function freezeInputManifest() {
  const files = listHtmlFiles(distRoot);
  if (files.length === 0) {
    console.error(`No HTML documents found below ${distRoot}`);
    process.exit(2);
  }
  return files
    .map((file) => {
      const routeId = routeFromHtml(distRoot, file);
      const html = readText(file);
      const metadata = pageMetadata(html, routeId);
      return {
        routeId,
        file: relativeToRepo(file),
        kind: classify(routeId, metadata, html),
        title: metadata.title,
        contentHash: contentHashFor(html),
      };
    })
    .sort((left, right) => left.routeId.localeCompare(right.routeId));
}

function readPreviousGeneration() {
  if (!existsSync(dataPath)) return null;
  try {
    return JSON.parse(readFileSync(dataPath, "utf8"));
  } catch (error) {
    console.error(`Committed capture data is not valid JSON at ${relativeToRepo(dataPath)}: ${error.message}`);
    process.exit(2);
  }
}

function generationIdFor(inputRows) {
  const canonical = JSON.stringify(
    inputRows.map((row) => [row.routeId, row.kind, row.contentHash]),
  );
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

function shotPaths(routeId, viewportId) {
  const stem = `${slugFor(routeId)}-${viewportId}.avif`;
  return {
    image: `record/shots/${stem}`,
    thumb: `record/shots/thumbs/${stem}`,
  };
}

function embeddedGeneration(distScreensHtml) {
  const match = distScreensHtml.match(/data-capture-generation="([a-f0-9]{4,})"/);
  return match ? match[1] : null;
}

// Dist-only verification. Never launches a browser, never writes captures.
function checkCoverage(inputRows, previous) {
  const byRoute = new Map((previous?.routes ?? []).map((entry) => [entry.routeId, entry]));
  const screensFile = inputRows.find((row) => row.routeId === SELF_CAPTURE_ROUTE)?.file;
  const distEmbedded = screensFile
    ? embeddedGeneration(canonicalHtmlForHash(readText(absolutePath(screensFile))))
    : null;
  const rows = [];
  for (const input of inputRows) {
    const entry = byRoute.get(input.routeId);
    if (!entry) {
      rows.push({ ...input, status: "failed", detail: "no capture entry recorded" });
      continue;
    }
    if (!STATUS.includes(entry.status)) {
      rows.push({ ...input, status: "failed", detail: `unknown status ${JSON.stringify(entry.status)}` });
      continue;
    }
    if (entry.status === "failed") {
      rows.push({ ...input, status: "failed", detail: entry.failure?.message ?? "recorded failure" });
      continue;
    }
    // The archive page depicts the previous generation by contract (see the
    // header): it is current exactly when the build embeds this generation
    // and the stored capture names the generation it supersedes.
    if (input.routeId === SELF_CAPTURE_ROUTE) {
      const chainOk =
        entry.selfCapture === true &&
        previous.generationId &&
        entry.depictsGeneration === previous.supersedes &&
        distEmbedded === previous.generationId;
      rows.push({
        ...input,
        status: chainOk ? "success" : "stale",
        detail: chainOk
          ? `self-capture depicts ${previous.supersedes ?? "the pre-capture archive"}`
          : `self-capture chain broken (embedded=${distEmbedded ?? "none"}, depicts=${entry.depictsGeneration ?? "none"}, supersedes=${previous.supersedes ?? "none"})`,
      });
      continue;
    }
    if (entry.status !== "success" || entry.contentHash !== input.contentHash) {
      rows.push({
        ...input,
        status: "stale",
        detail:
          entry.status !== "success"
            ? `recorded status is ${entry.status}`
            : "source build moved beyond the captured contentHash",
      });
      continue;
    }
    const missing = [];
    for (const viewport of VIEWPORTS) {
      for (const key of ["image", "thumb"]) {
        const relative = entry.artifacts?.[viewport.id]?.[key]?.replace(/^\//, "");
        // The gate verifies the checked artifact, not the working tree: a
        // capture that was never rebuilt into dist/ is missing here even when
        // public/ already carries it.
        if (!relative || !existsSync(join(distRoot, relative))) missing.push(`${viewport.id}:${key}`);
      }
    }
    rows.push({
      ...input,
      status: missing.length === 0 ? "success" : "failed",
      detail: missing.length === 0 ? "current" : `capture files missing from public/: ${missing.join(", ")}`,
    });
  }
  const success = rows.filter((row) => row.status === "success").length;
  const failed = rows.filter((row) => row.status === "failed").length;
  const stale = rows.filter((row) => row.status === "stale").length;
  return { rows, summary: { required: rows.length, success, failed, stale, complete: failed === 0 && stale === 0 } };
}

function reportCoverage(coverage) {
  const { required, success, failed, stale, complete } = coverage.summary;
  console.log(`Capture coverage: ${success}/${required} current, ${failed} failed, ${stale} stale.`);
  for (const row of coverage.rows.filter((entry) => entry.status !== "success")) {
    console.log(`  ${row.status.toUpperCase()} ${row.routeId} — ${row.detail}`);
  }
  console.log(complete ? "Coverage is 100%: every required route has a current capture." : "Coverage is INCOMPLETE.");
}

function startServer() {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      process.execPath,
      ["scripts/quality/serve-dist.mjs", "--dist", options.dist, "--port", String(options.port), "--host", "127.0.0.1"],
      { cwd: absolutePath("."), stdio: ["ignore", "pipe", "pipe"] },
    );
    let settled = false;
    const fail = (message) => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(new Error(message));
    };
    child.on("error", (error) => fail(`capture server failed to start: ${error.message}`));
    child.stderr.on("data", (chunk) => process.stderr.write(chunk));
    const readyTimer = setTimeout(() => fail(`capture server did not become ready on port ${options.port}`), 15000);
    const probe = async () => {
      for (let attempt = 0; attempt < 50; attempt += 1) {
        try {
          const response = await fetch(`http://127.0.0.1:${options.port}/`);
          if (response.ok) {
            clearTimeout(readyTimer);
            settled = true;
            resolvePromise(child);
            return;
          }
        } catch {
          // Server is still starting; retry below.
        }
        await sleep(200);
      }
      fail(`capture server did not become ready on port ${options.port}`);
    };
    child.stdout.on("data", () => {
      // First log line means the server is listening; confirm with a probe.
      void probe();
    });
    child.on("exit", (code) => fail(`capture server exited before becoming ready (code ${code})`));
  });
}

async function settlePage(page) {
  await page.evaluate(() => document.fonts.ready);
  // Walk the full document height so lazy-loaded sections mount before the
  // shot; instant scrolling keeps animations from mid-flight frames.
  await page.evaluate(async () => {
    const step = Math.max(window.innerHeight - 100, 200);
    const top = window.scrollY;
    for (let y = top; y < document.body.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: "instant" });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  const unsettled = await page.evaluate(async () => {
    const deadline = Date.now() + 15000;
    const images = [...document.images];
    while (Date.now() < deadline) {
      const pending = images.filter((img) => !(img.complete && img.naturalWidth > 0));
      if (pending.length === 0) return 0;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return images.filter((img) => !(img.complete && img.naturalWidth > 0)).length;
  });
  await sleep(500);
  return { unsettledImages: unsettled };
}

async function captureViewport(page, url, viewport, routeId) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  const response = await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  const httpStatus = response?.status() ?? 0;
  if (routeId === "/404.html" ? httpStatus !== 404 : httpStatus !== 200) {
    throw new Error(`unexpected HTTP ${httpStatus} for ${routeId}`);
  }
  const { unsettledImages } = await settlePage(page);
  const png = await page.screenshot({ fullPage: true });
  const image = sharp(png);
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height || metadata.width < 300 || metadata.height < 200) {
    throw new Error(`implausible screenshot dimensions ${metadata.width}x${metadata.height} for ${routeId}`);
  }
  const stats = await sharp(png).stats();
  const peakDeviation = Math.max(...stats.channels.map((channel) => channel.stdev ?? 0));
  if (peakDeviation < 3) {
    throw new Error(`screenshot for ${routeId} at ${viewport.id} decoded blank (peak channel deviation ${peakDeviation.toFixed(2)})`);
  }
  const paths = shotPaths(routeId, viewport.id);
  const fullOut = absolutePath(join("public", paths.image));
  const thumbOut = absolutePath(join("public", paths.thumb));
  mkdirSync(dirname(fullOut), { recursive: true });
  mkdirSync(dirname(thumbOut), { recursive: true });
  // Effort 2 keeps full-page text legible at fixed quality while encoding
  // several times faster than the default: this pipeline captures 174
  // viewports per generation and never runs its browser leg in CI.
  const fullInfo = await sharp(png).avif({ quality: 55, effort: 2 }).toFile(fullOut);
  const thumbInfo = await sharp(png)
    .resize({ width: Math.min(480, metadata.width), withoutEnlargement: true })
    .avif({ quality: 50, effort: 2 })
    .toFile(thumbOut);
  const thumbMeta = await sharp(thumbOut).metadata();
  return {
    image: `/${paths.image}`,
    thumb: `/${paths.thumb}`,
    w: fullInfo.width,
    h: fullInfo.height,
    bytes: fullInfo.size,
    thumbW: thumbMeta.width ?? 0,
    thumbH: thumbMeta.height ?? 0,
    thumbBytes: thumbInfo.size,
    httpStatus,
    unsettledImages,
  };
}

async function runCapture(inputRows, previous) {
  const previousByRoute = new Map((previous?.routes ?? []).map((entry) => [entry.routeId, entry]));
  const generationId = generationIdFor(inputRows);
  if (previous?.generationId === generationId && !options.force) {
    if (previous.coverage?.complete === true) {
      console.log(`Input manifest matches committed complete generation ${generationId.slice(0, 12)}; nothing to recapture.`);
      const coverage = checkCoverage(inputRows, previous);
      reportCoverage(coverage);
      if (options.strict && !coverage.summary.complete) process.exitCode = 1;
      return;
    }
    console.log(`Input manifest matches generation ${generationId.slice(0, 12)} but its coverage is incomplete; recapturing failed routes.`);
  }
  mkdirSync(qaRoot, { recursive: true });
  // A generation captures 174 viewports; a crash near the end must not lose
  // the run. Progress lands in the gitignored QA dir after every route and is
  // resumed (never trusted blindly: contentHash + files are re-verified).
  const resumePath = absolutePath(join(options.out, `resume-${generationId.slice(0, 12)}.json`));
  const resumedByRoute = new Map();
  if (!options.force && existsSync(resumePath)) {
    try {
      const resumed = JSON.parse(readFileSync(resumePath, "utf8"));
      if (resumed?.generationId === generationId && Array.isArray(resumed.routes)) {
        for (const entry of resumed.routes) resumedByRoute.set(entry.routeId, entry);
        console.log(`Resuming interrupted generation ${generationId.slice(0, 12)} at ${resumedByRoute.size} route(s).`);
      }
    } catch {
      console.log("Ignoring unreadable resume file; starting this generation fresh.");
    }
  }
  // Chain base for the self-capture contract: when this run heals a failed
  // attempt over the same input manifest, the new generation supersedes the
  // failed attempt's predecessor (not itself), and the screens capture
  // depicts that predecessor.
  const chainBase = previous && previous.generationId !== generationId
    ? previous.generationId
    : (previous?.supersedes ?? null);
  const persistResume = (routes) => {
    writeFileSync(resumePath, `${JSON.stringify({ generationId, savedAt: new Date().toISOString(), routes }, null, 2)}\n`);
  };
  const failures = [];
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const baseUrl = `http://127.0.0.1:${options.port}`;
  const jobs = Math.max(1, Number(options.jobs ?? 3) || 3);
  const routes = [];
  let infraFailures = 0;
  const queue = [...inputRows];
  const nextInput = () => queue.shift();
  console.log(`Capturing with ${jobs} worker(s).`);
  const isInfraFailure = (message) => /browser has been closed|context has been closed|Target page, context or browser has been closed|browser has disconnected/i.test(message);
  try {
    const captureOne = async (page, input) => {
      const startedAt = new Date().toISOString();
      try {
        const artifacts = {};
        for (const viewport of VIEWPORTS) {
          artifacts[viewport.id] = await captureViewport(page, `${baseUrl}${input.routeId}`, viewport, input.routeId);
        }
        const entry = {
          routeId: input.routeId,
          kind: input.kind,
          title: input.title,
          status: "success",
          contentHash: input.contentHash,
          capturedAt: startedAt,
          selfCapture: input.routeId === SELF_CAPTURE_ROUTE,
          depictsGeneration:
            input.routeId === SELF_CAPTURE_ROUTE ? chainBase : null,
          failure: null,
          artifacts,
        };
        routes.push(entry);
        infraFailures = 0;
        console.log(`shot   ${input.routeId} (${input.contentHash.slice(0, 12)})`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        try {
          await page.screenshot({ path: join(qaRoot, `${slugFor(input.routeId)}-failure.png`) });
        } catch {
          // Failure evidence is best-effort; the recorded detail is the gate input.
        }
        failures.push({ routeId: input.routeId, message });
        routes.push({
          routeId: input.routeId,
          kind: input.kind,
          title: input.title,
          status: "failed",
          contentHash: input.contentHash,
          capturedAt: startedAt,
          selfCapture: input.routeId === SELF_CAPTURE_ROUTE,
          depictsGeneration: null,
          failure: { message, at: startedAt },
          artifacts: {},
        });
        console.log(`FAILED ${input.routeId} — ${message}`);
        // A dead browser fails every remaining route with identical noise and
        // would then write a generation of bogus failures. Abort instead and
        // keep the resume file so the rerun continues where it stopped.
        if (isInfraFailure(message) && (infraFailures += 1) >= jobs * 2) {
          throw new Error(`aborting capture: browser infrastructure failed (${message})`);
        }
      }
      persistResume(routes);
    };
    // Carried and resumed entries resolve without a browser before workers start.
    const pending = [];
    for (const input of inputRows) {
      const prior = previousByRoute.get(input.routeId);
      const resumed = resumedByRoute.get(input.routeId);
      const filesPresent = (entry) =>
        VIEWPORTS.every((viewport) =>
          ["image", "thumb"].every((key) => {
            const relative = entry?.artifacts?.[viewport.id]?.[key]?.replace(/^\//, "");
            return relative && existsSync(absolutePath(join("public", relative)));
          }),
        );
      const carried =
        !options.force &&
        prior?.status === "success" &&
        prior.contentHash === input.contentHash &&
        prior.selfCapture !== true &&
        input.routeId !== SELF_CAPTURE_ROUTE &&
        filesPresent(prior);
      if (carried) {
        routes.push(prior);
        console.log(`carry  ${input.routeId} (${input.contentHash.slice(0, 12)})`);
        continue;
      }
      if (
        resumed?.status === "success" &&
        resumed.contentHash === input.contentHash &&
        filesPresent(resumed)
      ) {
        routes.push(resumed);
        console.log(`resume ${input.routeId} (${input.contentHash.slice(0, 12)})`);
        continue;
      }
      pending.push(input);
    }
    queue.push(...pending);
    const workers = Array.from({ length: Math.min(jobs, queue.length) }, async () => {
      const context = await browser.newContext({ reducedMotion: "reduce" });
      const page = await context.newPage();
      try {
        let input = nextInput();
        while (input) {
          await captureOne(page, input);
          input = nextInput();
        }
      } finally {
        await context.close();
      }
    });
    try {
      await Promise.all(workers);
    } catch (error) {
      // Infrastructure abort (dead browser): the resume file already holds
      // every completed route, so report and stop WITHOUT writing a partial
      // generation over the committed data.
      console.error(error instanceof Error ? error.message : String(error));
      console.error(`Resume state kept at ${relativeToRepo(resumePath)}; rerun --capture to continue.`);
      process.exitCode = 1;
      return;
    }
  } finally {
    await browser.close();
    server.kill();
  }
  const success = routes.filter((entry) => entry.status === "success").length;
  const manifest = {
    schemaVersion: 1,
    generationId,
    supersedes: chainBase,
    generatedAt: new Date().toISOString(),
    captureTool: {
      name: "scripts/quality/capture-record-visuals.mjs",
      codeVersion: CAPTURE_CODE_VERSION,
      browser: "Chromium (Playwright, headless, reduced motion)",
      viewports: VIEWPORTS,
    },
    sourceBuild: {
      directory: relativeToRepo(distRoot),
      base: distBase,
      inputManifestHash: generationId,
    },
    coverage: {
      required: routes.length,
      success,
      failed: routes.length - success,
      complete: success === routes.length,
    },
    routes: routes.sort((left, right) => left.routeId.localeCompare(right.routeId)),
  };
  mkdirSync(dirname(dataPath), { recursive: true });
  writeFileSync(dataPath, `${JSON.stringify(manifest, null, 2)}\n`);
  rmSync(resumePath, { force: true });
  writeFileSync(
    join(qaRoot, "evidence.json"),
    `${JSON.stringify({ mode, generatedAt: manifest.generatedAt, generationId, failures }, null, 2)}\n`,
  );
  console.log(`Wrote ${relativeToRepo(dataPath)} (generation ${generationId.slice(0, 12)}).`);
  console.log(`Capture coverage: ${success}/${routes.length} succeeded.`);
  if (failures.length > 0) {
    console.log("Failed routes (recorded, never labeled current):");
    for (const failure of failures) console.log(`  FAILED ${failure.routeId} — ${failure.message}`);
  }
  if (options.strict && !manifest.coverage.complete) process.exitCode = 1;
}

const inputRows = freezeInputManifest();
console.log(`Ledger input: ${inputRows.length} HTML document(s) from ${relativeToRepo(distRoot)} (base ${distBase}).`);

if (mode === "check") {
  const previous = readPreviousGeneration();
  if (!previous) {
    console.log(`No committed capture generation at ${relativeToRepo(dataPath)}; coverage is 0/${inputRows.length}.`);
    if (options.strict) process.exitCode = 1;
  } else {
    const coverage = checkCoverage(inputRows, previous);
    reportCoverage(coverage);
    if (options.strict && !coverage.summary.complete) process.exitCode = 1;
  }
} else {
  await runCapture(inputRows, readPreviousGeneration());
}

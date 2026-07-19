#!/usr/bin/env node
// Scheduled site-health sweep (gh#283).
//
// Runs the same link checker + sitemap-vs-disk consistency check used by
// the per-push CI job (gh#257, see lib.mjs), plus a one-page Lighthouse
// sample (accessibility + SEO categories) against the homepage, and
// writes a single machine-readable JSON report to
// scripts/ci/site-health-report.output.json (kept out of git — see
// .gitignore — this is a CI artifact, not source).
//
// If a GitHub token is available (see the "Reporting" section below),
// it also creates or updates a single tracking issue on
// INSTARLab/Website with the latest findings, so the sweep is
// actionable by a human or an agent without reading a CI log.
//
// This is wired into .gitlab-ci.yml behind
// `rules: - if: '$CI_PIPELINE_SOURCE == "schedule"'` (see comments
// there) — it only ever runs on a GitLab *scheduled* pipeline. Creating
// that schedule itself (Project > Build > Pipeline schedules) is a
// one-time manual step for a maintainer; it cannot be done from a
// commit. See the job comment in .gitlab-ci.yml for exact steps.
//
// Reporting (optional): set a CI/CD variable named SITE_HEALTH_GH_TOKEN
// to a GitHub token with `repo` (issues: write) scope on
// INSTARLab/Website for this script to auto-file/update the tracking
// issue. Without it, the job still runs and prints/saves the report —
// it just skips the GitHub API call and says so.
//
// Usage: node scripts/ci/site-health-report.mjs

import { spawn, spawnSync } from "node:child_process";
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { findBrokenLinks, findSitemapDrift, REPO_ROOT } from "./lib.mjs";

const REPORT_PATH = join(REPO_ROOT, "scripts", "ci", "site-health-report.output.json");
const GITHUB_REPO = "INSTARLab/Website"; // matches .gitlab-ci.yml's GITHUB_REPO variable
const ISSUE_MARKER = "<!-- site-health-sweep:auto-report -->";
const LIGHTHOUSE_PORT = 8973;

async function main() {
  const brokenLinks = findBrokenLinks();
  const sitemapDrift = findSitemapDrift();

  const report = {
    generatedAt: new Date().toISOString(),
    pipelineSource: process.env.CI_PIPELINE_SOURCE ?? "local",
    commit: process.env.CI_COMMIT_SHA ?? null,
    brokenLinks: {
      filesChecked: brokenLinks.filesChecked,
      linksChecked: brokenLinks.linksChecked,
      count: brokenLinks.broken.length,
      items: brokenLinks.broken,
    },
    sitemapDrift: {
      sitemapCount: sitemapDrift.sitemapCount,
      diskCount: sitemapDrift.diskCount,
      onDiskNotInSitemap: sitemapDrift.onDiskNotInSitemap,
      inSitemapNotOnDisk: sitemapDrift.inSitemapNotOnDisk,
    },
    lighthouse: await runLighthouse(),
  };

  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`Wrote report to ${REPORT_PATH}`);
  console.log(JSON.stringify(report, null, 2));

  await reportToGitHub(report);

  const hasProblems =
    report.brokenLinks.count > 0 ||
    report.sitemapDrift.onDiskNotInSitemap.length > 0 ||
    report.sitemapDrift.inSitemapNotOnDisk.length > 0;
  if (hasProblems) process.exitCode = 1;
}

async function runLighthouse() {
  let serverProc;
  try {
    serverProc = spawn(
      "node",
      [
        "-e",
        `require('http').createServer((req,res)=>{` +
          `const fs=require('fs'),path=require('path');` +
          `let p=path.join(${JSON.stringify(REPO_ROOT)}, decodeURIComponent(req.url.split('?')[0]));` +
          `if(p.endsWith('/')) p=path.join(p,'index.html');` +
          `fs.readFile(p,(err,data)=>{if(err){res.statusCode=404;res.end('not found');return;}res.end(data);});` +
          `}).listen(${LIGHTHOUSE_PORT});`,
      ],
      { stdio: "ignore" }
    );
    await new Promise((r) => setTimeout(r, 800)); // let the server bind

    const installResult = spawnSync(
      "npx",
      ["--yes", "@puppeteer/browsers", "install", "chrome@stable", "--path", "/tmp/site-health-chrome"],
      { encoding: "utf8" }
    );
    const lastLine = installResult.stdout.trim().split("\n").pop() ?? "";
    const chromePath = lastLine.split(/\s+/).pop();
    if (!chromePath || installResult.status !== 0) {
      return { skipped: true, reason: "could not install/locate a Chrome binary for Lighthouse" };
    }

    const outPath = "/tmp/site-health-lighthouse.json";
    const lhResult = spawnSync(
      "npx",
      [
        "--yes",
        "lighthouse@12",
        `http://localhost:${LIGHTHOUSE_PORT}/index.html`,
        "--output=json",
        `--output-path=${outPath}`,
        "--chrome-flags=--headless=new --no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage",
        "--only-categories=accessibility,seo,best-practices",
        "--quiet",
      ],
      { encoding: "utf8", env: { ...process.env, CHROME_PATH: chromePath } }
    );

    if (lhResult.status !== 0) {
      return { skipped: true, reason: `lighthouse exited ${lhResult.status}: ${lhResult.stderr.slice(-500)}` };
    }

    const lhJson = JSON.parse(readFileSync(outPath, "utf8"));
    const scores = {};
    for (const [key, val] of Object.entries(lhJson.categories ?? {})) {
      scores[key] = val.score;
    }
    return { page: "index.html", scores };
  } catch (err) {
    return { skipped: true, reason: err.message };
  } finally {
    if (serverProc) serverProc.kill();
  }
}

async function reportToGitHub(report) {
  const token = process.env.SITE_HEALTH_GH_TOKEN;
  if (!token) {
    console.log(
      "\nSITE_HEALTH_GH_TOKEN not set — skipping automatic GitHub issue create/update. " +
        "See the comment at the top of this script for how to enable it."
    );
    return;
  }

  const api = `https://api.github.com/repos/${GITHUB_REPO}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "instarlab-site-health-sweep",
  };

  const title = "Automated site-health sweep report";
  const body = `${ISSUE_MARKER}\n\n${renderReportBody(report)}`;

  try {
    const searchRes = await fetch(
      `${api}/issues?state=open&labels=site-health&per_page=50`,
      { headers }
    );
    if (!searchRes.ok) throw new Error(`list issues failed: ${searchRes.status}`);
    const issues = await searchRes.json();
    const existing = issues.find((i) => i.body?.includes(ISSUE_MARKER));

    if (existing) {
      const res = await fetch(`${api}/issues/${existing.number}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error(`update issue failed: ${res.status}`);
      console.log(`Updated tracking issue #${existing.number}.`);
    } else {
      const res = await fetch(`${api}/issues`, {
        method: "POST",
        headers,
        body: JSON.stringify({ title, body, labels: ["site-health"] }),
      });
      if (!res.ok) throw new Error(`create issue failed: ${res.status}`);
      const created = await res.json();
      console.log(`Filed new tracking issue #${created.number}.`);
    }
  } catch (err) {
    console.error(`GitHub reporting failed (non-fatal): ${err.message}`);
  }
}

function renderReportBody(report) {
  const lines = [];
  lines.push(`_Last updated: ${report.generatedAt} — commit \`${report.commit ?? "unknown"}\`._`);
  lines.push("");
  lines.push(`### Broken internal links (${report.brokenLinks.count})`);
  if (report.brokenLinks.count === 0) {
    lines.push("None found.");
  } else {
    for (const item of report.brokenLinks.items) {
      lines.push(`- \`${item.file}\`: \`${item.link}\` -> missing \`${item.resolved}\``);
    }
  }
  lines.push("");
  lines.push("### sitemap.xml drift");
  if (report.sitemapDrift.onDiskNotInSitemap.length === 0 && report.sitemapDrift.inSitemapNotOnDisk.length === 0) {
    lines.push("None found.");
  } else {
    for (const p of report.sitemapDrift.onDiskNotInSitemap) lines.push(`- on disk, missing from sitemap: \`${p}\``);
    for (const p of report.sitemapDrift.inSitemapNotOnDisk) lines.push(`- in sitemap, missing on disk: \`${p}\``);
  }
  lines.push("");
  lines.push("### Lighthouse sample (homepage)");
  if (report.lighthouse?.skipped) {
    lines.push(`Skipped: ${report.lighthouse.reason}`);
  } else if (report.lighthouse?.scores) {
    for (const [cat, score] of Object.entries(report.lighthouse.scores)) {
      lines.push(`- ${cat}: ${score === null ? "n/a" : Math.round(score * 100)}`);
    }
  }
  return lines.join("\n");
}

main();

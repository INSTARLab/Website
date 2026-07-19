// Shared helpers for the CI health-check scripts under scripts/ci/.
// Pure functions only (no process.exit / console.log here) so both the
// one-shot lint jobs (check-internal-links.mjs, check-sitemap.mjs) and
// the scheduled sweep (site-health-report.mjs, gh#283) can reuse the same
// logic without duplicating it.

import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, dirname, resolve, normalize, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const SITE_ORIGIN = "https://instarlab.org";

// Directories that are never part of the deployed static site.
const EXCLUDED_DIR_PARTS = new Set([".git", ".claude", "node_modules"]);
// Local-only gitignored mockups (see CLAUDE.md) — never production pages.
const EXCLUDED_FILENAMES = new Set(["nav-preview.html", "issue-triage.html"]);
// Pages that intentionally have no sitemap entry.
const EXPECTED_SITEMAP_OMISSIONS = new Set(["404.html"]);

export function listHtmlFiles(dir = REPO_ROOT, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIR_PARTS.has(entry.name)) continue;
      listHtmlFiles(join(dir, entry.name), out);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      if (EXCLUDED_FILENAMES.has(entry.name)) continue;
      out.push(relative(REPO_ROOT, join(dir, entry.name)).split(sep).join("/"));
    }
  }
  return out;
}

function extractLinks(html) {
  const links = [];
  const attrRe = /\b(?:href|src)\s*=\s*"([^"]*)"/gi;
  let m;
  while ((m = attrRe.exec(html))) links.push(m[1]);
  return links;
}

function isSkippable(link) {
  if (!link) return true;
  const lower = link.trim().toLowerCase();
  if (lower === "" || lower === "#") return true;
  if (lower.startsWith("#")) return true; // same-page anchor
  if (lower.startsWith("http://") || lower.startsWith("https://")) return true;
  if (lower.startsWith("//")) return true; // protocol-relative external
  if (lower.startsWith("mailto:") || lower.startsWith("tel:")) return true;
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) return true;
  if (lower === "about:blank") return true; // valid iframe placeholder src
  return false;
}

function resolveLink(link, fileDir) {
  let target = link.split("#")[0].split("?")[0];
  if (target === "") return null;

  let abs = target.startsWith("/") ? join(REPO_ROOT, target) : join(REPO_ROOT, fileDir, target);
  abs = normalize(abs);

  if (abs.endsWith("/")) {
    abs = join(abs, "index.html");
  } else if (existsSync(abs) && statSync(abs).isDirectory()) {
    abs = join(abs, "index.html");
  }
  return abs;
}

/**
 * Scans every tracked HTML file for internal href/src links that don't
 * resolve to a real file on disk.
 * @returns {{filesChecked: number, linksChecked: number, broken: Array<{file: string, link: string, resolved: string}>}}
 */
export function findBrokenLinks() {
  const files = listHtmlFiles();
  const broken = [];
  let linksChecked = 0;

  for (const relFile of files) {
    const html = readFileSync(join(REPO_ROOT, relFile), "utf8");
    const fileDir = dirname(relFile);

    for (const link of extractLinks(html)) {
      if (isSkippable(link)) continue;
      const resolved = resolveLink(link, fileDir);
      if (resolved === null) continue;
      linksChecked++;
      if (!existsSync(resolved)) {
        broken.push({ file: relFile, link, resolved: relative(REPO_ROOT, resolved) });
      }
    }
  }

  return { filesChecked: files.length, linksChecked, broken };
}

/**
 * Compares sitemap.xml against the HTML files actually on disk.
 * @returns {{sitemapCount: number, diskCount: number, onDiskNotInSitemap: string[], inSitemapNotOnDisk: string[]}}
 */
export function findSitemapDrift() {
  const xml = readFileSync(join(REPO_ROOT, "sitemap.xml"), "utf8");
  const locRe = /<loc>([^<]+)<\/loc>/g;
  const sitemapPaths = new Set();
  let m;
  while ((m = locRe.exec(xml))) {
    let url = m[1].trim();
    if (!url.startsWith(SITE_ORIGIN)) continue;
    let path = url.slice(SITE_ORIGIN.length);
    if (path === "") path = "/";
    sitemapPaths.add(path);
  }

  const diskPaths = new Set();
  for (const file of listHtmlFiles()) {
    if (file === "index.html") diskPaths.add("/");
    else if (file.endsWith("/index.html")) diskPaths.add("/" + file.slice(0, -"index.html".length));
    else diskPaths.add("/" + file);
  }

  const onDiskNotInSitemap = [...diskPaths]
    .filter((p) => !sitemapPaths.has(p))
    .filter((p) => !EXPECTED_SITEMAP_OMISSIONS.has(p.replace(/^\//, "")))
    .sort();
  const inSitemapNotOnDisk = [...sitemapPaths].filter((p) => !diskPaths.has(p)).sort();

  return {
    sitemapCount: sitemapPaths.size,
    diskCount: diskPaths.size,
    onDiskNotInSitemap,
    inSitemapNotOnDisk,
  };
}

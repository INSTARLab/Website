import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import posixPath from "node:path/posix";

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const SKIPPED_DIRECTORY_NAMES = new Set([".git", ".astro", "node_modules", "artifacts", "dist"]);

export function parseArgs(argv, defaults = {}) {
  const options = { ...defaults, positional: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--strict") {
      options.strict = true;
      continue;
    }
    if (argument === "--help" || argument === "-h") {
      options.help = true;
      continue;
    }
    if (!argument.startsWith("--")) {
      options.positional.push(argument);
      continue;
    }

    const equalsIndex = argument.indexOf("=");
    if (equalsIndex !== -1) {
      options[argument.slice(2, equalsIndex)] = argument.slice(equalsIndex + 1);
      continue;
    }

    const key = argument.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      options[key] = next;
      index += 1;
    } else {
      options[key] = true;
    }
  }

  return options;
}

export function absolutePath(value) {
  return resolve(REPO_ROOT, value ?? ".");
}

export function relativeToRepo(value) {
  const relativePath = relative(REPO_ROOT, value).split(sep).join("/");
  return relativePath || ".";
}

export function listFiles(root, predicate = () => true) {
  if (!existsSync(root)) throw new Error(`Directory does not exist: ${root}`);
  const files = [];

  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && SKIPPED_DIRECTORY_NAMES.has(entry.name)) continue;
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && predicate(absolute)) files.push(absolute);
    }
  }

  visit(root);
  return files.sort();
}

export function listHtmlFiles(root) {
  return listFiles(root, (file) => /\.html?$/i.test(file));
}

export function routeFromHtml(root, file) {
  const relativeFile = relative(root, file).split(sep).join("/");
  if (relativeFile === "index.html") return "/";

  if (relativeFile.endsWith("/index.html")) {
    return `/${relativeFile.slice(0, -"index.html".length)}`;
  }

  if (!relativeFile.includes("/") && relativeFile.endsWith(".html")) {
    return `/${relativeFile}`;
  }

  return `/${relativeFile.replace(/\.html?$/i, "")}`;
}

export function readText(file) {
  return readFileSync(file, "utf8");
}

export function parseAttributes(tag) {
  const attributes = {};
  const nameMatch = tag.match(/^<\s*[^\s/>]+/);
  if (!nameMatch) return attributes;

  const source = tag.slice(nameMatch[0].length);
  const attributePattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = attributePattern.exec(source))) {
    const name = match[1].toLowerCase();
    if (name === "/") continue;
    attributes[name] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attributes;
}

export function openingTags(html, tagNames = []) {
  const names = tagNames.length > 0 ? tagNames.join("|") : "[a-z][a-z0-9:-]*";
  const pattern = new RegExp(`<(${names})\\b[^>]*>`, "gi");
  return [...html.matchAll(pattern)].map((match) => ({
    name: match[1].toLowerCase(),
    raw: match[0],
    attributes: parseAttributes(match[0]),
    index: match.index ?? 0,
  }));
}

function decodeBasicEntities(value) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

export function textContent(value) {
  return decodeBasicEntities(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

export function firstMatch(html, pattern) {
  const match = html.match(pattern);
  return match ? match[1] : "";
}

export function pageMetadata(html, route) {
  const title = textContent(firstMatch(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i));
  const pageSignature = firstMatch(html, /data-page-signature=["']([^"']*)["']/i);
  const visualModes = pageSignature
    ? pageSignature.split(/\s*→\s*/).map((mode) => mode.trim()).filter(Boolean)
    : [];
  const descriptionTag = openingTags(html, ["meta"]).find(
    ({ attributes }) => attributes.name?.toLowerCase() === "description"
  );
  const robotsTag = openingTags(html, ["meta"]).find(
    ({ attributes }) => attributes.name?.toLowerCase() === "robots"
  );
  const canonicalTag = openingTags(html, ["link"]).find(({ attributes }) =>
    attributes.rel?.toLowerCase().split(/\s+/).includes("canonical")
  );
  const h1Count = (html.match(/<h1\b/gi) ?? []).length;
  const mainCount = (html.match(/<main\b/gi) ?? []).length;
  const description = descriptionTag?.attributes.content ?? "";
  const robots = robotsTag?.attributes.content ?? "";
  const indexable = !/\bnoindex\b/i.test(robots);

  return {
    route,
    title,
    description,
    canonical: canonicalTag?.attributes.href ?? "",
    h1Count,
    mainCount,
    robots,
    indexable,
    pageSignature,
    visualModes,
  };
}

export function normalizeReference(reference) {
  const value = String(reference ?? "").trim();
  const hashIndex = value.indexOf("#");
  const withoutFragment = hashIndex === -1 ? value : value.slice(0, hashIndex);
  const queryIndex = withoutFragment.indexOf("?");
  return {
    raw: value,
    path: queryIndex === -1 ? withoutFragment : withoutFragment.slice(0, queryIndex),
    fragment: hashIndex === -1 ? "" : value.slice(hashIndex + 1).split("?")[0],
  };
}

export function isSkippableReference(reference) {
  const value = String(reference ?? "").trim().toLowerCase();
  return (
    value === "" ||
    value === "#" ||
    value.startsWith("#") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:") ||
    value.startsWith("javascript:") ||
    value.startsWith("data:") ||
    value.startsWith("blob:") ||
    value === "about:blank"
  );
}

export function isExternalReference(reference, origin = "") {
  if (!/^https?:\/\//i.test(reference)) return false;
  if (!origin) return true;
  try {
    return new URL(reference).origin !== new URL(origin).origin;
  } catch {
    return true;
  }
}

function decodePath(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function normalizeBasePath(value = "") {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "/") return "";
  const pathname = raw.includes("://") ? new URL(raw).pathname : raw;
  const trimmed = pathname.replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}` : "";
}

export function stripBasePath(pathname, base = "") {
  const normalizedBase = normalizeBasePath(base);
  if (!normalizedBase) return pathname || "/";
  if (pathname === normalizedBase) return "/";
  return pathname.startsWith(`${normalizedBase}/`) ? pathname.slice(normalizedBase.length) || "/" : pathname;
}

export function resolveDistReference(reference, htmlFile, root, origin = "", base = "") {
  if (isSkippableReference(reference)) return { skipped: true };
  if (isExternalReference(reference, origin)) return { external: true };

  const normalized = normalizeReference(reference);
  let pathname = normalized.path;
  if (/^https?:\/\//i.test(pathname)) {
    try {
      pathname = new URL(pathname).pathname;
    } catch {
      return { external: true };
    }
  }
  pathname = stripBasePath(pathname, base);

  const htmlRelative = relative(root, htmlFile).split(sep).join("/");
  const baseDirectory = dirname(htmlRelative) === "." ? "" : dirname(htmlRelative);
  const rawPath = pathname.startsWith("/")
    ? pathname.slice(1)
    : posixPath.join(baseDirectory, pathname);
  const normalizedPath = posixPath.normalize(`/${decodePath(rawPath)}`).replace(/^\//, "");
  const candidates = new Set();

  if (normalizedPath === "" || normalizedPath.endsWith("/")) {
    candidates.add(posixPath.join(normalizedPath, "index.html"));
  } else {
    candidates.add(normalizedPath);
    if (!extname(normalizedPath)) {
      candidates.add(posixPath.join(normalizedPath, "index.html"));
      candidates.add(`${normalizedPath}.html`);
    }
  }

  for (const candidate of candidates) {
    const resolved = resolve(root, candidate);
    if (resolved === root || resolved.startsWith(`${root}${sep}`)) {
      if (existsSync(resolved) && statSync(resolved).isFile()) {
        return {
          external: false,
          skipped: false,
          raw: normalized.raw,
          path: `/${candidate}`,
          fragment: normalized.fragment,
          file: resolved,
        };
      }
    }
  }

  return {
    external: false,
    skipped: false,
    raw: normalized.raw,
    path: `/${normalizedPath}`,
    fragment: normalized.fragment,
    file: null,
  };
}

export function internalReferences(html) {
  const tags = openingTags(html, ["a", "area", "form", "iframe", "img", "link", "script", "source", "track", "video", "audio"]);
  const references = [];

  for (const tag of tags) {
    const attributeNames = [];
    if (["a", "area", "iframe", "link"].includes(tag.name)) attributeNames.push("href");
    if (tag.name === "form") attributeNames.push("action");
    if (["iframe", "img", "script", "source", "track", "video", "audio"].includes(tag.name)) {
      attributeNames.push("src");
    }
    if (tag.name === "video") attributeNames.push("poster");

    for (const attribute of attributeNames) {
      if (tag.attributes[attribute] !== undefined) {
        references.push({ tag: tag.name, attribute, value: tag.attributes[attribute] });
      }
    }

    if (tag.attributes.srcset) {
      for (const candidate of tag.attributes.srcset.split(",")) {
        const value = candidate.trim().split(/\s+/)[0];
        if (value) references.push({ tag: tag.name, attribute: "srcset", value });
      }
    }
  }

  return references;
}

export function hasFragment(html, fragment) {
  if (!fragment) return true;
  const decoded = decodePath(fragment);
  const escaped = decoded.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:id|name)=["']${escaped}["']`, "i").test(html);
}

export function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

export function writeJson(outPath, value) {
  if (!outPath) return;
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(value, null, 2)}\n`);
  console.log(`Wrote ${relativeToRepo(outPath)}`);
}

export function printHelp(lines) {
  if (lines.length > 0) console.log(lines.join("\n"));
}

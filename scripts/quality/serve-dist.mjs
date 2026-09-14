#!/usr/bin/env node

import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, relative, resolve } from "node:path";
import { absolutePath, parseArgs } from "./lib.mjs";

const options = parseArgs(process.argv.slice(2), { dist: "dist", port: "4173", host: "127.0.0.1" });
const root = absolutePath(options.dist);
const port = Number(options.port);
const host = options.host;

if (!existsSync(root)) {
  console.error(`Rendered output not found: ${root}`);
  process.exit(2);
}
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`Invalid port: ${options.port}`);
  process.exit(2);
}

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

function safePath(requestUrl) {
  const url = new URL(requestUrl, `http://${host}:${port}`);
  const decoded = decodeURIComponent(url.pathname);
  const candidate = resolve(root, `.${decoded}`);
  if (candidate !== root && !candidate.startsWith(`${root}/`)) return null;
  return { candidate, pathname: url.pathname, search: url.search };
}

function isFile(item) {
  return existsSync(item) && statSync(item).isFile();
}

function notFoundFile() {
  const fallback = join(root, "404.html");
  return isFile(fallback) ? fallback : null;
}

/**
 * Reproduces the contract the production host actually serves, verified against
 * https://www.instarlab.org: an existing directory without a trailing slash
 * answers 301 to its trailing-slash form, a bare `name` is served from
 * `name.html`, and everything else falls back to the 404 document. Answering
 * `/record` with a 200 out of `index.html` would let the browser suite pass on
 * a navigation production never performs.
 */
function resolveRequest({ candidate, pathname, search }) {
  if (isFile(candidate)) return { file: candidate };

  if (existsSync(candidate) && statSync(candidate).isDirectory()) {
    if (!pathname.endsWith("/")) {
      // `pathname` is client-supplied; collapse a leading slash run so the
      // redirect target cannot be read as a protocol-relative URL.
      return { redirect: `${pathname.replace(/^\/{2,}/, "/")}/${search}` };
    }
    const index = join(candidate, "index.html");
    return { file: isFile(index) ? index : notFoundFile() };
  }

  if (!extname(candidate)) {
    const sibling = `${candidate}.html`;
    if (isFile(sibling)) return { file: sibling };
  }

  return { file: notFoundFile() };
}

const server = createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { allow: "GET, HEAD" });
    response.end("Method Not Allowed");
    return;
  }

  let resolved;
  try {
    const target = safePath(request.url ?? "/");
    resolved = target ? resolveRequest(target) : null;
  } catch {
    response.writeHead(400);
    response.end("Bad Request");
    return;
  }

  if (resolved?.redirect) {
    response.writeHead(301, { location: resolved.redirect, "cache-control": "no-store" });
    response.end();
    return;
  }

  const file = resolved?.file ?? null;
  if (!file) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not Found");
    return;
  }

  const status = file.endsWith("404.html") ? 404 : 200;
  response.writeHead(status, {
    "content-type": mimeTypes[extname(file).toLowerCase()] ?? "application/octet-stream",
    "cache-control": "no-store",
  });
  if (request.method === "HEAD") response.end();
  else createReadStream(file).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Serving ${relative(process.cwd(), root) || "."} at http://${host}:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}

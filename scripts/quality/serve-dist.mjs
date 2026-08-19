#!/usr/bin/env node

import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
  const pathname = new URL(requestUrl, `http://${host}:${port}`).pathname;
  const decoded = decodeURIComponent(pathname);
  const candidate = resolve(root, `.${decoded}`);
  if (candidate !== root && !candidate.startsWith(`${root}/`)) return null;
  return candidate;
}

function findFile(candidate) {
  const candidates = [candidate];
  if (candidate.endsWith("/")) candidates.push(join(candidate, "index.html"));
  else if (!extname(candidate)) {
    candidates.push(join(candidate, "index.html"));
    candidates.push(`${candidate}.html`);
  }
  for (const item of candidates) {
    if (existsSync(item) && statSync(item).isFile()) return item;
  }
  const fallback = join(root, "404.html");
  return existsSync(fallback) && statSync(fallback).isFile() ? fallback : null;
}

const server = createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { allow: "GET, HEAD" });
    response.end("Method Not Allowed");
    return;
  }

  let candidate;
  try {
    candidate = safePath(request.url ?? "/");
  } catch {
    response.writeHead(400);
    response.end("Bad Request");
    return;
  }
  const file = candidate ? findFile(candidate) : null;
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

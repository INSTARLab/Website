#!/usr/bin/env node

import { readFile, readdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const DEFAULT_ORIGIN = 'https://instarlab.org';

function parseArgs(argv) {
  const args = { dist: 'dist', origin: DEFAULT_ORIGIN, strict: false, requireJsonLd: false };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--dist') args.dist = argv[++index];
    else if (argument === '--origin') args.origin = argv[++index];
    else if (argument === '--strict') args.strict = true;
    else if (argument === '--require-jsonld') args.requireJsonLd = true;
    else if (argument === '--help' || argument === '-h') {
      console.log('Usage: node scripts/quality/validate-dist-metadata.mjs [--dist dist] [--origin https://instarlab.org] [--strict] [--require-jsonld]');
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return args;
}

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await htmlFiles(path)));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(path);
  }

  return files;
}

function decodeHtml(value) {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

function tags(html, tagName) {
  return [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, 'gi'))].map((match) => match[0]);
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return match ? decodeHtml(match[1]) : undefined;
}

function firstTagWithAttribute(html, tagName, attributeName, expected) {
  return tags(html, tagName).find((tag) => attribute(tag, attributeName)?.toLowerCase() === expected.toLowerCase());
}

function metadataValue(html, tagName, attributeName, expected, valueName) {
  const tag = firstTagWithAttribute(html, tagName, attributeName, expected);
  return tag ? attribute(tag, valueName) : undefined;
}

function absoluteUrl(value, origin) {
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.origin === origin;
  } catch {
    return false;
  }
}

function jsonLdScripts(html) {
  return [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1].trim());
}

function inspectJsonLd(value, location, issues) {
  if (Array.isArray(value)) {
    value.forEach((item) => inspectJsonLd(item, location, issues));
    return;
  }

  if (!value || typeof value !== 'object') {
    issues.push(`${location}: JSON-LD root must be an object or array`);
    return;
  }

  if (value['@context'] !== undefined && value['@context'] !== 'https://schema.org') {
    issues.push(`${location}: @context must be https://schema.org`);
  }

  if (value['@type'] !== undefined && (typeof value['@type'] !== 'string' || value['@type'].trim() === '')) {
    issues.push(`${location}: @type must be a non-empty string`);
  }

  if (value['@id'] !== undefined && !/^https?:\/\//i.test(value['@id'])) {
    issues.push(`${location}: @id must be absolute`);
  }

  if (value['@graph'] !== undefined) {
    if (!Array.isArray(value['@graph']) || value['@graph'].length === 0) {
      issues.push(`${location}: @graph must be a non-empty array`);
    } else {
      value['@graph'].forEach((item, index) => inspectJsonLd(item, `${location}.@graph[${index}]`, issues));
    }
  }
}

async function validateFile(file, options) {
  const html = await readFile(file, 'utf8');
  const errors = [];
  const warnings = [];
  const location = relative(process.cwd(), file);
  const titleTags = tags(html, 'title');
  const titleElements = [...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)];
  const description = metadataValue(html, 'meta', 'name', 'description', 'content');
  const canonical = metadataValue(html, 'link', 'rel', 'canonical', 'href');
  const robots = metadataValue(html, 'meta', 'name', 'robots', 'content');
  const jsonLd = jsonLdScripts(html);

  if (titleTags.length !== 1 || titleElements.length !== 1 || !decodeHtml(titleElements[0][1]).trim()) {
    errors.push('requires exactly one non-empty <title>');
  }
  if (!description?.trim()) errors.push('requires one non-empty meta description');
  if (!canonical || !absoluteUrl(canonical, options.origin)) {
    errors.push(`requires one canonical URL on ${options.origin}`);
  }
  if (!robots?.trim()) errors.push('requires one robots directive');

  for (const [property, label] of [
    ['og:title', 'Open Graph title'],
    ['og:description', 'Open Graph description'],
    ['og:url', 'Open Graph URL'],
    ['twitter:card', 'Twitter card'],
  ]) {
    if (!metadataValue(html, 'meta', 'property', property, 'content') && !metadataValue(html, 'meta', 'name', property, 'content')) {
      errors.push(`requires ${label}`);
    }
  }

  if (jsonLd.length === 0) {
    if (options.requireJsonLd) errors.push('requires at least one JSON-LD block');
    else warnings.push('contains no JSON-LD block; enable --require-jsonld when structured data is emitted');
  }

  jsonLd.forEach((source, index) => {
    try {
      inspectJsonLd(JSON.parse(source), `${location}:jsonld[${index}]`, errors);
    } catch (error) {
      errors.push(`${location}:jsonld[${index}] is invalid JSON (${error.message})`);
    }
  });

  return { errors, warnings, jsonLdCount: jsonLd.length };
}

const options = parseArgs(process.argv.slice(2));
const dist = resolve(options.dist);
const origin = new URL(options.origin).origin;
const files = await htmlFiles(dist);
if (files.length === 0) throw new Error(`No HTML files found under ${dist}`);

let errorCount = 0;
let warningCount = 0;
let jsonLdCount = 0;

for (const file of files) {
  const result = await validateFile(file, { ...options, origin });
  jsonLdCount += result.jsonLdCount;
  errorCount += result.errors.length;
  warningCount += result.warnings.length;
  for (const error of result.errors) console.error(`ERROR ${error}`);
  for (const warning of result.warnings) console.warn(`WARN  ${relative(process.cwd(), file)}: ${warning}`);
}

if (options.strict) errorCount += warningCount;

console.log(`Metadata validation: ${files.length} HTML file(s), ${jsonLdCount} JSON-LD block(s), ${errorCount} error(s), ${warningCount} warning(s)`);
if (errorCount > 0) process.exit(1);

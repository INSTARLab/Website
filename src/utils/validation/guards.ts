import type {
  EditorialContent,
  EditorialMedia,
  EditorialMediaProvenance,
  AbsoluteUrl,
  SiteAssetUrl,
} from '../../types/editorial-contracts';
import type { JsonLdDocument, JsonLdInput } from '../../types/json-ld';

const EDITORIAL_MEDIA_KINDS = new Set(['image', 'video', 'audio', 'diagram']);
const EDITORIAL_MEDIA_ROLES = new Set([
  'hero',
  'orientation',
  'evidence',
  'observation',
  'inline',
  'system-mark',
]);
const EDITORIAL_FAMILIES = new Set([
  'research',
  'technology',
  'sciences',
  'community',
  'labs',
  'news',
  'fellowship',
  'tech-transfer',
]);

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isAbsoluteUrl(value: unknown): value is AbsoluteUrl {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return false;

  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function isSiteAssetUrl(value: unknown): value is SiteAssetUrl {
  return isAbsoluteUrl(value) || (typeof value === 'string' && value.startsWith('/'));
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isMediaProvenance(value: unknown): value is EditorialMediaProvenance {
  if (!isRecord(value) || !isNonEmptyString(value.kind)) return false;

  switch (value.kind) {
    case 'owned':
      return value.license === 'all-rights-reserved';
    case 'licensed':
      return isNonEmptyString(value.license) && isAbsoluteUrl(value.source);
    case 'public-domain':
      return value.license === 'public-domain' && isAbsoluteUrl(value.source);
    case 'decorative':
      return isNonEmptyString(value.rationale);
    default:
      return false;
  }
}

export function isEditorialMedia(value: unknown): value is EditorialMedia {
  return (
    isRecord(value) &&
    EDITORIAL_MEDIA_KINDS.has(String(value.kind)) &&
    isSiteAssetUrl(value.src) &&
    typeof value.alt === 'string' &&
    isPositiveNumber(value.width) &&
    isPositiveNumber(value.height) &&
    EDITORIAL_MEDIA_ROLES.has(String(value.role)) &&
    isMediaProvenance(value.provenance)
  );
}

function isAuthor(value: unknown): boolean {
  if (typeof value === 'string') return isNonEmptyString(value);
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    (value.url === undefined || isAbsoluteUrl(value.url))
  );
}

function isContentBase(value: Record<string, unknown>): boolean {
  return (
    isNonEmptyString(value.slug) &&
    isNonEmptyString(value.title) &&
    isNonEmptyString(value.description) &&
    isNonEmptyString(value.publishedAt) &&
    Array.isArray(value.authors) &&
    value.authors.length > 0 &&
    value.authors.every(isAuthor) &&
    Array.isArray(value.topics) &&
    value.topics.every(isNonEmptyString) &&
    (value.updatedAt === undefined || isNonEmptyString(value.updatedAt)) &&
    (value.canonicalUrl === undefined || isAbsoluteUrl(value.canonicalUrl)) &&
    (value.noindex === undefined || typeof value.noindex === 'boolean') &&
    (value.media === undefined || (Array.isArray(value.media) && value.media.every(isEditorialMedia)))
  );
}

export function isEditorialContent(value: unknown): value is EditorialContent {
  if (!isRecord(value) || !isContentBase(value)) return false;

  if (value.kind === 'article') return true;
  return (
    value.kind === 'page' &&
    EDITORIAL_FAMILIES.has(String(value.family)) &&
    typeof value.path === 'string' &&
    /^\/.+\/$/.test(value.path)
  );
}

function hasSchemaContext(value: Record<string, unknown>): boolean {
  return value['@context'] === 'https://schema.org';
}

function isJsonLdNode(value: unknown): boolean {
  return isRecord(value) && isNonEmptyString(value['@type']);
}

export function isJsonLdDocument(value: unknown): value is JsonLdDocument {
  if (!isRecord(value) || !hasSchemaContext(value)) return false;

  if ('@graph' in value) {
    return Array.isArray(value['@graph']) && value['@graph'].length > 0 && value['@graph'].every(isJsonLdNode);
  }

  return isJsonLdNode(value);
}

export function isJsonLdInput(value: unknown): value is JsonLdInput {
  return isJsonLdDocument(value) || (Array.isArray(value) && value.length > 0 && value.every(isJsonLdDocument));
}

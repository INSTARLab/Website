/**
 * Stable, framework-agnostic contracts for editorial route and content data.
 *
 * These types intentionally describe the data boundary rather than any one
 * Astro component. Content loaders, route manifests, and future CMS adapters
 * can use them without importing UI code.
 */

export type AbsoluteUrl = `http://${string}` | `https://${string}`;
export type SitePath = `/${string}`;
export type DirectoryPath = `/${string}/`;
export type SiteAssetUrl = SitePath | AbsoluteUrl;

export const EDITORIAL_FAMILIES = [
  'research',
  'technology',
  'sciences',
  'community',
  'labs',
  'news',
  'fellowship',
  'tech-transfer',
] as const;

export type EditorialFamily = (typeof EDITORIAL_FAMILIES)[number];

export const EDITORIAL_FAMILY_META = {
  research: { label: 'Research', root: '/research/' },
  technology: { label: 'Technology', root: '/technology/' },
  sciences: { label: 'Sciences', root: '/sciences/' },
  community: { label: 'Community', root: '/community/' },
  labs: { label: 'Labs', root: '/labs/' },
  news: { label: 'Research brief', root: '/news/' },
  fellowship: { label: 'Fellowship', root: '/fellowship/' },
  'tech-transfer': { label: 'Tech transfer', root: '/tech-transfer/' },
} as const satisfies Readonly<
  Record<EditorialFamily, { readonly label: string; readonly root: DirectoryPath }>
>;

export const EDITORIAL_VISUAL_MODES = [
  'orientation',
  'evidence',
  'observation',
  'sequence',
  'contrast',
  'participation',
  'connection',
] as const;

export type EditorialVisualMode = (typeof EDITORIAL_VISUAL_MODES)[number];

export type EditorialMediaKind = 'image' | 'video' | 'audio' | 'diagram';

export const EDITORIAL_MEDIA_ROLES = [
  'hero',
  'orientation',
  'evidence',
  'observation',
  'inline',
  'system-mark',
] as const;

export type EditorialMediaRole = (typeof EDITORIAL_MEDIA_ROLES)[number];

/**
 * Provenance is a discriminated union so a media record cannot silently omit
 * the information needed to explain why an asset may be published.
 */
export type EditorialMediaProvenance =
  | {
      readonly kind: 'owned';
      readonly license: 'all-rights-reserved';
      readonly credit?: string;
    }
  | {
      readonly kind: 'licensed';
      readonly license: string;
      readonly source: AbsoluteUrl;
      readonly credit?: string;
    }
  | {
      readonly kind: 'public-domain';
      readonly license: 'public-domain';
      readonly source: AbsoluteUrl;
      readonly credit?: string;
    }
  | {
      readonly kind: 'decorative';
      readonly rationale: string;
    };

export interface EditorialMedia {
  readonly kind: EditorialMediaKind;
  readonly src: SiteAssetUrl;
  /** Use an empty string only when the asset is genuinely decorative. */
  readonly alt: string;
  readonly width: number;
  readonly height: number;
  readonly role: EditorialMediaRole;
  readonly provenance: EditorialMediaProvenance;
  readonly caption?: string;
  readonly focalPoint?: string;
}

export interface EditorialAuthor {
  readonly id: string;
  readonly name: string;
  readonly role?: string;
  readonly url?: AbsoluteUrl;
}

export interface EditorialContentBase {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly publishedAt: string;
  readonly updatedAt?: string;
  readonly authors: readonly (string | EditorialAuthor)[];
  readonly topics: readonly string[];
  readonly media?: readonly EditorialMedia[];
  readonly canonicalUrl?: AbsoluteUrl;
  readonly noindex?: boolean;
}

export interface EditorialArticle extends EditorialContentBase {
  readonly kind: 'article';
}

export interface EditorialPage extends EditorialContentBase {
  readonly kind: 'page';
  readonly family: EditorialFamily;
  readonly path: DirectoryPath;
}

export type EditorialContent = EditorialArticle | EditorialPage;

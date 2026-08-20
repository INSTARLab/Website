import type { ImageMetadata } from 'astro';
import type {
  FocalPoint,
  MediaAlt,
  MediaAsset,
  MediaFetchPriority,
  MediaId,
  MediaLoading,
  MediaOutputFormat,
  MediaProvenance,
  MediaRole,
  MediaType,
} from '../../data/media/types';
import { stableMediaId } from './ids';

export interface PublicMediaInput {
  readonly id?: MediaId;
  readonly url: `/${string}`;
  readonly type: MediaType;
  readonly role: MediaRole;
  readonly alt: MediaAlt;
  readonly dimensions: { readonly width: number; readonly height: number };
  readonly sizes: string;
  readonly provenance: MediaProvenance;
  readonly loading?: MediaLoading;
  readonly fetchpriority?: MediaFetchPriority;
  readonly focalPoint?: FocalPoint;
  readonly caption?: string;
  readonly credit?: string;
  readonly reuseReason?: string;
}

/**
 * Keep exact-URL public assets auditable without pretending they are Astro
 * processed imports. The source and license deliberately remain explicit so
 * inherited assets can be reviewed by the media owner later.
 */
export function createPublicMedia(input: PublicMediaInput): MediaAsset {
  return {
    id: input.id ?? stableMediaId(input.url, 'media:route-'),
    source: { kind: 'public', url: input.url },
    type: input.type,
    role: input.role,
    alt: input.alt,
    dimensions: input.dimensions,
    sizes: input.sizes,
    loading: input.loading ?? 'lazy',
    fetchpriority: input.fetchpriority ?? 'auto',
    focalPoint: input.focalPoint ?? '50% 50%',
    provenance: input.provenance,
    caption: input.caption,
    credit: input.credit,
    reuseReason: input.reuseReason,
  };
}

export interface AstroMediaInput {
  readonly id: MediaId;
  readonly image: ImageMetadata;
  readonly type: MediaType;
  readonly role: MediaRole;
  readonly alt: MediaAlt;
  readonly provenance: MediaProvenance;
  readonly sizes: string;
  readonly loading?: MediaLoading;
  readonly fetchpriority?: MediaFetchPriority;
  readonly focalPoint?: FocalPoint;
  readonly widths?: readonly number[];
  readonly formats?: readonly MediaOutputFormat[];
  readonly caption?: string;
  readonly credit?: string;
  readonly reuseReason?: string;
}

export function createAstroMedia(input: AstroMediaInput): MediaAsset {
  return {
    id: input.id,
    source: { kind: 'astro', image: input.image },
    type: input.type,
    role: input.role,
    alt: input.alt,
    dimensions: { width: input.image.width, height: input.image.height },
    sizes: input.sizes,
    loading: input.loading ?? 'lazy',
    fetchpriority: input.fetchpriority ?? 'auto',
    focalPoint: input.focalPoint ?? '50% 50%',
    provenance: input.provenance,
    widths: input.widths,
    formats: input.formats,
    caption: input.caption,
    credit: input.credit,
    reuseReason: input.reuseReason,
  };
}

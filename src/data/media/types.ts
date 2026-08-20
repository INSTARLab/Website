import type { ImageMetadata } from 'astro';

export type MediaId = `media:${string}`;

export type MediaType =
  | 'photography-or-illustration'
  | 'icon-or-mark'
  | 'data-graphic'
  | 'map-or-system-visualization'
  | 'technical-diagram'
  | 'video-or-animation-poster'
  | 'audio-or-transcript';

export type MediaRole =
  | 'hero'
  | 'orientation'
  | 'observation'
  | 'evidence'
  | 'sequence'
  | 'connection'
  | 'system-mark';

export type FocalPoint = `${number}% ${number}%`;
export type MediaLoading = 'lazy' | 'eager';
export type MediaFetchPriority = 'auto' | 'high' | 'low';
export type MediaOutputFormat = 'avif' | 'webp' | 'jpeg' | 'png';

export type MediaAlt =
  | {
      readonly kind: 'decorative';
      readonly status: 'approved';
      readonly text: '';
    }
  | {
      readonly kind: 'descriptive' | 'contextual';
      readonly status: 'approved' | 'review-required';
      readonly text?: string;
    };

export interface MediaDimensions {
  readonly width: number;
  readonly height: number;
}

export interface MediaProvenance {
  readonly status: 'verified' | 'unverified' | 'not-applicable';
  readonly source: string;
  readonly license: string;
  readonly note?: string;
}

export type MediaSource =
  | {
      readonly kind: 'public';
      readonly url: `/${string}`;
    }
  | {
      readonly kind: 'astro';
      readonly image: ImageMetadata;
    };

export interface MediaAsset {
  readonly id: MediaId;
  readonly source: MediaSource;
  readonly type: MediaType;
  readonly role: MediaRole;
  readonly alt: MediaAlt;
  readonly dimensions: MediaDimensions;
  readonly sizes: string;
  readonly loading: MediaLoading;
  readonly fetchpriority: MediaFetchPriority;
  readonly focalPoint: FocalPoint;
  readonly provenance: MediaProvenance;
  readonly widths?: readonly number[];
  readonly formats?: readonly MediaOutputFormat[];
  readonly caption?: string;
  readonly credit?: string;
  readonly reuseReason?: string;
}

export type MediaAssetOverrides = Partial<
  Pick<
    MediaAsset,
    | 'alt'
    | 'sizes'
    | 'loading'
    | 'fetchpriority'
    | 'focalPoint'
    | 'widths'
    | 'formats'
    | 'caption'
    | 'credit'
    | 'reuseReason'
    | 'provenance'
  >
>;

export type PublicMediaPolicy = Omit<MediaAsset, 'id' | 'source'> & {
  readonly match: string;
  readonly idPrefix: string;
};

export type EditorialAssetKind =
  | 'photography'
  | 'illustration'
  | 'icon'
  | 'data-graphic'
  | 'map'
  | 'technical-diagram'
  | 'video-poster';

export type EditorialMediaRole =
  | 'hero'
  | 'observation'
  | 'evidence'
  | 'orientation'
  | 'sequence'
  | 'connection';

export type FocalPoint = `${number}% ${number}%`;

export interface EditorialAsset {
  id: string;
  kind: EditorialAssetKind;
  role: EditorialMediaRole;
  src: string;
  alt: string;
  caption?: string;
  credit?: string;
  width?: number;
  height?: number;
  focalPoint?: FocalPoint;
  desktopCrop?: string;
  mobileCrop?: string;
  source?: string;
  license?: string;
}

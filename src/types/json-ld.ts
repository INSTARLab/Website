import type { AbsoluteUrl } from './editorial-contracts';

export type JsonLdContext = 'https://schema.org';

export interface JsonLdReference {
  readonly '@id': AbsoluteUrl;
}

export interface JsonLdImageObject {
  readonly '@type': 'ImageObject';
  readonly '@id'?: AbsoluteUrl;
  readonly url: AbsoluteUrl;
  readonly contentUrl?: AbsoluteUrl;
  readonly caption?: string;
  readonly width?: number;
  readonly height?: number;
}

export interface JsonLdPerson {
  readonly '@type': 'Person';
  readonly '@id'?: AbsoluteUrl;
  readonly name: string;
  readonly url?: AbsoluteUrl;
}

export interface JsonLdOrganization {
  readonly '@type': 'Organization';
  readonly '@id'?: AbsoluteUrl;
  readonly name: string;
  readonly url?: AbsoluteUrl;
  readonly logo?: AbsoluteUrl | JsonLdImageObject;
  readonly sameAs?: readonly AbsoluteUrl[];
}

export interface JsonLdWebSite {
  readonly '@type': 'WebSite';
  readonly '@id'?: AbsoluteUrl;
  readonly name: string;
  readonly url: AbsoluteUrl;
  readonly publisher?: JsonLdOrganization | JsonLdReference;
}

export interface JsonLdWebPage {
  readonly '@type': 'WebPage';
  readonly '@id'?: AbsoluteUrl;
  readonly name: string;
  readonly description?: string;
  readonly url: AbsoluteUrl;
  readonly isPartOf?: JsonLdReference | JsonLdWebSite;
  readonly breadcrumb?: JsonLdReference | JsonLdBreadcrumbList;
  readonly primaryImageOfPage?: JsonLdReference | JsonLdImageObject;
}

export interface JsonLdArticle {
  readonly '@type': 'Article' | 'NewsArticle';
  readonly '@id'?: AbsoluteUrl;
  readonly headline: string;
  readonly description?: string;
  readonly url: AbsoluteUrl;
  readonly datePublished: string;
  readonly dateModified?: string;
  readonly author: readonly (JsonLdPerson | JsonLdReference)[];
  readonly image?: readonly (AbsoluteUrl | JsonLdImageObject)[];
  readonly publisher?: JsonLdOrganization | JsonLdReference;
  readonly mainEntityOfPage?: JsonLdReference | JsonLdWebPage;
}

export interface JsonLdListItem {
  readonly '@type': 'ListItem';
  readonly position: number;
  readonly name: string;
  readonly item: AbsoluteUrl | JsonLdReference;
}

export interface JsonLdBreadcrumbList {
  readonly '@type': 'BreadcrumbList';
  readonly '@id'?: AbsoluteUrl;
  readonly itemListElement: readonly JsonLdListItem[];
}

export type JsonLdNode =
  | JsonLdImageObject
  | JsonLdPerson
  | JsonLdOrganization
  | JsonLdWebSite
  | JsonLdWebPage
  | JsonLdArticle
  | JsonLdBreadcrumbList;

export type JsonLdDocument =
  | (JsonLdNode & { readonly '@context': JsonLdContext })
  | {
      readonly '@context': JsonLdContext;
      readonly '@graph': readonly JsonLdNode[];
    };

export type JsonLdInput = JsonLdDocument | readonly JsonLdDocument[];

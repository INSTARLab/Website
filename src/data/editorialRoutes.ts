import {
  getInstarResearchTechnologySciencesRoutes,
  type InstarResearchTechnologySciencesRoute,
} from './instar-research-technology-sciences';
import { workstream5Routes } from './workstream5/manifest';
import type { W5Family, W5RouteRecord, W5VisualMode } from './workstream5/types';

export type EditorialFamily =
  | 'research'
  | 'technology'
  | 'sciences'
  | W5Family;

export interface EditorialRoute {
  readonly path: `/${string}`;
  readonly slug: string;
  readonly family: EditorialFamily;
  readonly title: string;
  readonly description: string;
  readonly eyebrow: string;
  readonly hero: string;
  readonly heroAlt: string;
  readonly signature: readonly string[];
  readonly pageJob: string;
  readonly readyAction: string;
  readonly earlyAction: string;
  readonly composition?: string;
  readonly type?: 'website' | 'article';
}

const familyLabels: Record<EditorialFamily, string> = {
  research: 'Research',
  technology: 'Technology',
  sciences: 'Sciences',
  community: 'Community',
  labs: 'Labs',
  news: 'Research brief',
  fellowship: 'Fellowship',
  'tech-transfer': 'Tech transfer',
};

const familyRoots: Record<EditorialFamily, string> = {
  research: '/research/current-programs/',
  technology: '/technology/computer-science/',
  sciences: '/sciences/physics/',
  community: '/community/about-us/',
  labs: '/labs/sovereign-ai/',
  news: '/news/',
  fellowship: '/fellowship/',
  'tech-transfer': '/tech-transfer/portfolio/',
};

function slugFromPath(path: string): string {
  return path.split('/').filter(Boolean).at(-1) ?? 'index';
}

function normalizeAssetPath(path: string): string {
  const normalized = path.replace(/^(?:\.\.\/)+/, '/');
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function mediaAlt(title: string): string {
  return `${title} — INSTAR Lab editorial image`;
}

function routeFromRts(route: InstarResearchTechnologySciencesRoute): EditorialRoute {
  const slug = route.slug;
  return {
    path: route.path,
    slug,
    family: route.family,
    title: route.title,
    description: route.description ?? `Explore INSTAR Lab's ${route.heading.toLowerCase()} work through an evidence-led, interdisciplinary lens.`,
    eyebrow: `${familyLabels[route.family]} / ${route.heading}`,
    hero: `/${route.banner.replace(/^\//, '')}`,
    heroAlt: mediaAlt(route.title),
    signature: route.pageSignature.split(' → '),
    pageJob: `Help a reader understand what ${route.heading.toLowerCase()} makes possible, what to examine, and where a serious next question begins.`,
    readyAction: route.family === 'research' ? 'Discuss a research pathway with INSTAR.' : 'Explore the adjacent research pathway.',
    earlyAction: `Start with the ${route.heading.toLowerCase()} orientation and follow the evidence.`,
    composition: route.composition,
  };
}

function routeFromW5(route: W5RouteRecord): EditorialRoute {
  const hero = route.media.find((media) => media.role === 'orientation')?.src ?? '/img/banners/news.avif';
  const signature = route.signature as readonly W5VisualMode[];
  return {
    path: route.path,
    slug: slugFromPath(route.path),
    family: route.family,
    title: route.title,
    description: route.description,
    eyebrow: `${familyLabels[route.family]} / ${slugFromPath(route.path).replaceAll('-', ' ')}`,
    hero,
    heroAlt: mediaAlt(route.title),
    signature,
    pageJob: route.pageJob,
    readyAction: route.readyAction,
    earlyAction: route.earlyAction,
    type: route.family === 'news' ? 'article' : 'website',
  };
}

export const editorialRoutes: readonly EditorialRoute[] = [
  ...(['research', 'technology', 'sciences'] as const).flatMap((family) =>
    getInstarResearchTechnologySciencesRoutes(family).map(routeFromRts),
  ),
  ...workstream5Routes.map(routeFromW5),
];

export function editorialRouteAtPath(path: string): EditorialRoute {
  const route = editorialRoutes.find((entry) => entry.path === path);
  if (!route) throw new Error(`Unknown editorial route: ${path}`);
  return route;
}

export function editorialRoutesForFamily(family: EditorialFamily): readonly EditorialRoute[] {
  return editorialRoutes.filter((route) => route.family === family);
}

export function editorialRelatedRoutes(route: EditorialRoute, limit = 4): readonly EditorialRoute[] {
  const sameFamily = editorialRoutes.filter((entry) => entry.family === route.family && entry.path !== route.path);
  return sameFamily.slice(0, limit);
}

export function familyLabel(family: EditorialFamily): string {
  return familyLabels[family];
}

export function familyRoot(family: EditorialFamily): string {
  return familyRoots[family];
}

export { normalizeAssetPath };

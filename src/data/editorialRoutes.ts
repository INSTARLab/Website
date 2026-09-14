import {
  getInstarResearchTechnologySciencesRoutes,
  type InstarResearchTechnologySciencesRoute,
  type InstarResearchTechnologySciencesComposition,
} from './instar-research-technology-sciences';
import { workstream5Routes } from './workstream5/manifest';
import type { W5Family, W5RouteRecord, W5VisualMode } from './workstream5/types';

export type EditorialFamily =
  | 'research'
  | 'technology'
  | 'sciences'
  | W5Family;

export type EditorialVisualMode = W5VisualMode;

export interface EditorialRouteMedia {
  readonly src: `/${string}`;
  readonly alt: string;
  readonly caption: string;
  readonly width: number;
  readonly height: number;
  readonly focalPoint: `${number}% ${number}%`;
}

export interface EditorialRoute {
  readonly path: `/${string}`;
  readonly slug: string;
  readonly family: EditorialFamily;
  readonly title: string;
  readonly description: string;
  readonly eyebrow: string;
  readonly hero: string;
  readonly heroAlt: string;
  readonly signature: readonly [EditorialVisualMode, EditorialVisualMode, EditorialVisualMode, ...EditorialVisualMode[]];
  readonly pageJob: string;
  readonly readyAction: string;
  readonly earlyAction: string;
  readonly composition?: string;
  readonly primaryMedia?: EditorialRouteMedia;
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
  research: '/research/',
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

const routeMediaDimensions: Readonly<Record<string, Pick<EditorialRouteMedia, 'width' | 'height'>>> = {
  '/img/pages/consortium/hero.avif': { width: 1170, height: 400 },
  '/img/pages/current-programs/card-1-current.avif': { width: 370, height: 250 },
  '/img/pages/facilities/card-1.avif': { width: 370, height: 250 },
  '/img/pages/innovation/section-1.avif': { width: 570, height: 370 },
  '/img/slider/geospatial.avif': { width: 1920, height: 800 },
  '/img/pages/opportunities/card-1.avif': { width: 370, height: 200 },
  '/img/pages/our-process/hero.avif': { width: 1170, height: 400 },
  '/img/pages/augmented-reality/showcase-1.avif': { width: 570, height: 370 },
  '/img/pages/computer-science/card-1.avif': { width: 370, height: 200 },
  '/img/pages/data-science/card-1.avif': { width: 370, height: 250 },
  '/img/pages/formal-methods/hero.avif': { width: 1170, height: 400 },
  '/img/pages/machine-intelligence/section-1.avif': { width: 570, height: 370 },
  '/img/projects/nlp-tech-language-understanding.avif': { width: 800, height: 600 },
  '/img/pages/quantum-computing/hero.avif': { width: 770, height: 400 },
  '/img/pages/agriculture/card-1.avif': { width: 370, height: 200 },
  '/img/pages/anthropology/hero.avif': { width: 770, height: 400 },
  '/img/pages/archaeology/card-1.avif': { width: 555, height: 370 },
  '/img/pages/biology/card-1.avif': { width: 370, height: 250 },
  '/img/pages/chemistry/card-1.avif': { width: 370, height: 250 },
  '/img/pages/cognitive-sciences/hero.avif': { width: 1170, height: 400 },
  '/img/pages/economics/card-1.avif': { width: 370, height: 250 },
  '/img/pages/energy/section-1.avif': { width: 570, height: 370 },
  '/img/pages/genetics/hero.avif': { width: 770, height: 400 },
  '/img/pages/geology/card-1.avif': { width: 555, height: 370 },
  '/img/pages/kinesiology/card-1.avif': { width: 555, height: 370 },
  '/img/pages/law/hero.avif': { width: 770, height: 400 },
  '/img/pages/linguistics/card-1.avif': { width: 370, height: 200 },
  '/img/pages/materials-science/hero.avif': { width: 770, height: 400 },
  '/img/pages/medicine/section-1.avif': { width: 570, height: 370 },
  '/img/pages/neuroscience/card-1.avif': { width: 370, height: 200 },
  '/img/pages/ocean-science/hero.avif': { width: 1170, height: 400 },
  '/img/pages/outer-space/section-1.avif': { width: 570, height: 370 },
  '/img/pages/physics/section-1.avif': { width: 570, height: 370 },
  '/img/pages/physiology/card-1.avif': { width: 370, height: 200 },
  '/img/pages/psychology/section-1.avif': { width: 570, height: 370 },
  '/img/pages/sociology/card-1.avif': { width: 370, height: 200 },
  '/img/pages/about-us/section-1-aboutus.avif': { width: 570, height: 370 },
  '/img/pages/careers/card-1.avif': { width: 555, height: 370 },
  '/img/pages/leadership/hero.avif': { width: 1170, height: 400 },
  '/img/pages/fellowship/inline-1.avif': { width: 570, height: 370 },
  '/img/help-us-bg.avif': { width: 1920, height: 530 },
  '/img/pages/enterprise-rd/card-1.avif': { width: 370, height: 250 },
  '/img/pages/portfolio/card-1.avif': { width: 370, height: 250 },
  '/img/pages/sttr-programs/section-1.avif': { width: 570, height: 370 },
  '/img/pages/workshops-events/card-1.avif': { width: 555, height: 370 },
};

const supportingMediaByRoute: Readonly<Record<string, string>> = {
  '/community/about-us/': '/img/pages/about-us/section-1-aboutus.avif',
  '/community/careers/': '/img/pages/careers/card-1.avif',
  '/community/leadership/': '/img/pages/leadership/hero.avif',
  '/community/support/': '/img/help-us-bg.avif',
  '/fellowship/': '/img/pages/fellowship/inline-1.avif',
  '/tech-transfer/enterprise-rd/': '/img/pages/enterprise-rd/card-1.avif',
  '/tech-transfer/portfolio/': '/img/pages/portfolio/card-1.avif',
  '/tech-transfer/sttr-programs/': '/img/pages/sttr-programs/section-1.avif',
  '/tech-transfer/workshops-events/': '/img/pages/workshops-events/card-1.avif',
};

const visualModesByComposition: Record<
  InstarResearchTechnologySciencesComposition,
  readonly [EditorialVisualMode, EditorialVisualMode, EditorialVisualMode, ...EditorialVisualMode[]]
> = {
  'consortium-network': ['orientation', 'observation', 'connection', 'participation'],
  'evidence-index': ['orientation', 'evidence', 'observation', 'connection'],
  'funding-pathway': ['orientation', 'sequence', 'contrast', 'participation'],
  'research-narrative': ['orientation', 'observation', 'evidence', 'contrast', 'connection'],
  'data-atlas': ['orientation', 'evidence', 'observation', 'participation', 'connection'],
  'opportunity-index': ['orientation', 'evidence', 'sequence', 'participation'],
  'research-method': ['orientation', 'sequence', 'evidence', 'contrast', 'participation'],
  'technology-narrative': ['orientation', 'observation', 'evidence', 'contrast', 'connection'],
  'technology-index': ['orientation', 'evidence', 'sequence', 'connection'],
  'science-narrative': ['orientation', 'observation', 'evidence', 'contrast', 'connection'],
  'science-index': ['orientation', 'evidence', 'observation', 'connection'],
};

function mediaForRoute(src: string, title: string): EditorialRouteMedia | undefined {
  const normalized = normalizeAssetPath(src) as `/${string}`;
  const dimensions = routeMediaDimensions[normalized];
  if (!dimensions) return undefined;

  return {
    src: normalized,
    alt: `${title} — INSTAR Lab`,
    caption: 'Supporting visual from the repository asset library. Read the adjacent text for the claim and its limits.',
    ...dimensions,
    focalPoint: '50% 50%',
  };
}

function mediaAlt(title: string): string {
  return `${title} — INSTAR Lab`;
}

function routeFromRts(route: InstarResearchTechnologySciencesRoute): EditorialRoute {
  const slug = route.slug;
  return {
    path: route.path,
    slug,
    family: route.family,
    title: route.title,
    description: route.description ?? `INSTAR applies advanced AI, high-performance computing, and domain methods to ${route.heading.toLowerCase()} research, with attention to reproducibility, uncertainty, and outputs a sponsor can evaluate.`,
    eyebrow: `${familyLabels[route.family]} / ${route.heading}`,
    hero: `/${route.banner.replace(/^\//, '')}`,
    heroAlt: mediaAlt(route.title),
    signature: visualModesByComposition[route.composition],
    pageJob: `Help a program officer, contracting team, or research collaborator understand what ${route.heading.toLowerCase()} makes possible, what must be tested, and what a credible next phase would require.`,
    readyAction: route.family === 'research' ? 'Discuss a federal research or sponsored-program pathway with INSTAR.' : 'Discuss a technical research need with INSTAR.',
    earlyAction: `Review the ${route.heading.toLowerCase()} capability, methods, and evidence before deciding on fit.`,
    composition: route.composition,
    primaryMedia: route.primaryMedia ? mediaForRoute(route.primaryMedia, route.title) : undefined,
  };
}

function routeFromW5(route: W5RouteRecord): EditorialRoute {
  const hero = route.media.find((media) => media.role === 'orientation')?.src ?? '/img/banners/news.avif';
  const signature = route.signature;
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
    primaryMedia: supportingMediaByRoute[route.path]
      ? mediaForRoute(supportingMediaByRoute[route.path], route.title)
      : undefined,
    composition: `${route.family}-${route.signature.find((mode) => mode !== 'orientation') ?? 'orientation'}`,
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
  const sameComposition = route.composition
    ? sameFamily.filter((entry) => entry.composition === route.composition)
    : [];
  const remaining = sameFamily.filter((entry) => !sameComposition.includes(entry));
  return [...sameComposition, ...remaining].slice(0, limit);
}

export function familyLabel(family: EditorialFamily): string {
  return familyLabels[family];
}

export function familyRoot(family: EditorialFamily): string {
  return familyRoots[family];
}

export { normalizeAssetPath };

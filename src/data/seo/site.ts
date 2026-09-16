export interface SeoBreadcrumbItem {
  readonly name: string;
  readonly href?: string;
}

export interface SeoSiteIdentity {
  readonly name: string;
  readonly legalName: string;
  readonly description: string;
  readonly logoPath: string;
  readonly email: string;
  readonly telephone: string;
  readonly address: {
    readonly streetAddress: string;
    readonly addressLocality: string;
    readonly addressRegion: string;
    readonly postalCode: string;
    readonly addressCountry: string;
  };
}

/**
 * Canonical-host decision (gh#335): www is the single canonical host.
 *
 * The custom domain redirects the apex host to www, so keep absolute
 * discovery URLs on the host visitors and crawlers actually receive. That is
 * why this origin, `public/CNAME`, `public/robots.txt`, the sitemap, and
 * every canonical/OG URL the shared shell emits all use www: one host, no
 * authority split. There are no non-www absolute URLs in src/ — keep it that
 * way so a future edit cannot reintroduce the duplicate-content signal.
 */
export const siteOrigin = 'https://www.instarlab.org' as const;

/**
 * Facts already published in the site's footer and public discovery metadata.
 * Keep this deliberately small: structured data must not introduce claims
 * that a reader cannot verify on the site.
 */
export const siteIdentity = {
  name: 'INSTAR Lab',
  legalName: 'INSTAR Lab Inc.',
  description:
    'INSTAR Lab is a 501(c)(3) nonprofit research institute conducting applied research in artificial intelligence, quantum science, high-performance computing, health, energy, space, and the sciences for federal and institutional research partners.',
  logoPath: '/img/logo/instar.svg',
  email: 'info@instarlab.org',
  telephone: '929-229-2917',
  address: {
    streetAddress: '125 Frederick St',
    addressLocality: 'Marietta',
    addressRegion: 'OH',
    postalCode: '45750-3407',
    addressCountry: 'US',
  },
} as const satisfies SeoSiteIdentity;

const breadcrumbRootTargets = {
  research: { name: 'Research', href: '/research/current-programs/' },
  technology: { name: 'Technology', href: '/technology/computer-science/' },
  sciences: { name: 'Sciences', href: '/sciences/physics/' },
  community: { name: 'Community', href: '/community/about-us/' },
  labs: { name: 'Labs', href: '/labs/sovereign-ai/' },
  news: { name: 'News', href: '/news/' },
  fellowship: { name: 'Fellowship', href: '/fellowship/' },
  'tech-transfer': { name: 'Tech transfer', href: '/tech-transfer/portfolio/' },
} as const satisfies Record<string, SeoBreadcrumbItem>;

const segmentLabels: Record<string, string> = {
  'about-us': 'About Us',
  accessibility: 'Accessibility',
  agriculture: 'Agriculture',
  'augmented-reality': 'Augmented Reality',
  biology: 'Biology',
  'cognitive-sciences': 'Cognitive Sciences',
  chemistry: 'Chemistry',
  'computer-science': 'Computer Science',
  contact: 'Contact',
  'contact-us': 'Contact Us',
  careers: 'Careers',
  'current-programs': 'Current Programs',
  'data-science': 'Data Science',
  economics: 'Economics',
  energy: 'Energy',
  'energy-transition': 'Energy Transition',
  'enterprise-rd': 'Enterprise R&D',
  facilities: 'Facilities',
  fellowship: 'Fellowship',
  'formal-methods': 'Formal Methods',
  genetics: 'Genetics',
  geology: 'Geology',
  'hpc-infrastructure-for-ai': 'HPC Infrastructure for AI',
  innovation: 'Innovation',
  kinesiology: 'Kinesiology',
  law: 'Law',
  'machine-intelligence': 'Machine Intelligence',
  'materials-science': 'Materials Science',
  medicine: 'Medicine',
  mission: 'Mission',
  neuroscience: 'Neuroscience',
  'natural-language-processing': 'Natural Language Processing',
  'open-data': 'Open Data',
  'open-data-research-philosophy': 'Open Data and Research Philosophy',
  'outer-space': 'Outer Space',
  physics: 'Physics',
  physiology: 'Physiology',
  portfolio: 'Portfolio',
  privacy: 'Privacy',
  psychology: 'Psychology',
  'quantum-computing': 'Quantum Computing',
  'quantum-sensing-breakthroughs': 'Quantum Sensing Breakthroughs',
  research: 'Research',
  'research-infrastructure': 'Research Infrastructure',
  'safety-critical-trust': 'Safety-Critical Trust',
  sciences: 'Sciences',
  'sovereign-ai': 'Sovereign AI',
  sociology: 'Sociology',
  'sttr-programs': 'STTR Programs',
  technology: 'Technology',
  'tech-transfer': 'Tech Transfer',
  terms: 'Terms of Use',
  'workshops-events': 'Workshops & Events',
};

function labelForSegment(segment: string): string {
  return segmentLabels[segment] ?? segment
    .split('-')
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(' ');
}

function normalizePath(path: string): string {
  const pathname = path.split(/[?#]/, 1)[0] || '/';
  if (pathname === '/') return pathname;
  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

/**
 * Builds breadcrumbs from the public URL hierarchy. Parent links intentionally
 * point to existing family landing pages because several clean URL parents do
 * not have standalone generated routes.
 */
export function buildBreadcrumbs(path: string, currentName: string): readonly SeoBreadcrumbItem[] {
  const normalizedPath = normalizePath(path);
  const segments = normalizedPath.split('/').filter(Boolean);
  if (segments.length === 0) return [];

  const items: SeoBreadcrumbItem[] = [{ name: 'Home', href: '/' }];

  segments.forEach((segment, index) => {
    const isLast = index === segments.length - 1;
    const rootTarget = breadcrumbRootTargets[segment as keyof typeof breadcrumbRootTargets];
    if (index === 0 && rootTarget) {
      items.push(rootTarget);
      if (isLast) items[items.length - 1] = { name: currentName };
      return;
    }

    if (isLast) {
      items.push({ name: currentName });
      return;
    }

    const parentPath = `/${segments.slice(0, index + 1).join('/')}/`;
    items.push({ name: labelForSegment(segment), href: parentPath });
  });

  return items;
}

export function absoluteSeoUrl(value: string | URL, siteUrl: URL): string {
  return new URL(value.toString(), siteUrl).href;
}

export function withFragment(url: string, fragment: string): string {
  const value = new URL(url);
  value.hash = fragment;
  return value.href;
}

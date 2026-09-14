import { coreRoutes } from './core-routes';
import { editorialRoutes, familyLabel } from './editorialRoutes';
import { publicMediaFor, publicMediaPolicies } from './media';
import { siteIdentity, siteOrigin } from './seo/site';

export {
  recordBi,
  recordBiIsStale,
  recordBiMetricDefinition,
  recordBiMetricDefinitions,
  recordBiObservationValueState,
  recordBiObservations,
  recordBiSnapshot,
  recordBiStatusForMetric,
  recordBiValueStateForMetric,
  validateRecordBiSnapshot,
} from './record-bi';
export type {
  RecordBiApproval,
  RecordBiApprovalBasis,
  RecordBiDomain,
  RecordBiMetricDefinition,
  RecordBiMetricState,
  RecordBiObservation,
  RecordBiPeriod,
  RecordBiSnapshot,
  RecordBiSource,
  RecordBiValueState,
} from './record-bi';

export interface RecordRoute {
  readonly path: `/record/${string}`;
  readonly label: string;
  readonly title: string;
  readonly description: string;
  readonly eyebrow: string;
  readonly signature: readonly [string, string, string, ...string[]];
}

export interface SitePageRecord {
  readonly path: string;
  readonly title: string;
  readonly family: string;
  readonly kind: 'core' | 'editorial' | 'section' | 'record';
  readonly description: string;
  readonly source: string;
  readonly indexable: boolean;
}

export interface RecordJourney {
  readonly id: string;
  readonly label: string;
  readonly question: string;
  readonly steps: readonly { label: string; href: string }[];
  readonly nextAction: { label: string; href: string };
}

export interface RecordFile {
  readonly label: string;
  readonly path: string;
  readonly kind: string;
  readonly status: 'published' | 'review-required' | 'source-only';
  readonly note: string;
}

export interface RecordSource {
  readonly id: string;
  readonly label: string;
  readonly locator: string;
  readonly status: 'verified-in-repository' | 'review-required' | 'not-public';
  readonly supports: string;
  readonly limits: string;
}

export interface RecordExternalSource {
  readonly id: string;
  readonly label: string;
  readonly publisher: string;
  readonly locator: string;
  readonly retrievedAt: string;
  readonly publishes: string;
  readonly limits: string;
  readonly note?: string;
  readonly fallback?: { readonly label: string; readonly locator: string };
}

export interface RecordVisual {
  readonly id: string;
  readonly title: string;
  readonly href: string;
  readonly src: `/${string}`;
  readonly alt: string;
  readonly caption: string;
  readonly width: number;
  readonly height: number;
  readonly mediaId: string;
  readonly mediaRole: string;
  readonly source: string;
  readonly license: string;
  readonly reuseReason: string;
}

export function recordHref(path: string): string {
  const base = import.meta.env.BASE_URL;
  if (base === '/') return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base.replace(/\/$/, '')}${normalized}`;
}

const route = (
  path: RecordRoute['path'],
  label: string,
  title: string,
  description: string,
  eyebrow: string,
  signature: RecordRoute['signature'],
): RecordRoute => ({ path, label, title, description, eyebrow, signature });

export const recordRoutes = [
  route('/record/', 'Record room', 'INSTAR Lab public record', 'A compact, source-conscious index of INSTAR Lab\'s public identity, research pathways, website structure, media, and evidence boundaries.', 'Public record / index', ['orientation', 'evidence', 'connection', 'participation']),
  route('/record/leadership/', 'Leadership', 'Leadership, governance, and affiliations', 'What the public site identifies about INSTAR Lab\'s institutional leadership and research relationships, with a clear boundary around unpublished personnel records.', 'Institution / people', ['orientation', 'observation', 'evidence', 'connection']),
  route('/record/legal/', 'Legal status', 'Legal status, filings, and the §6104(d) request path', 'The institution\'s legal identity, exemption classification, and ruling date, each next to the source that carries it, plus the statutory route for requesting the records a tax-exempt organization has to provide.', 'Institution / legal status', ['orientation', 'evidence', 'contrast', 'connection']),
  route('/record/governance/', 'Governance', 'Board and policy register', 'The board seats and the policies a donor or a board member would look for, with each row stating what establishes it and the rows nothing establishes published empty rather than omitted.', 'Institution / governance', ['orientation', 'evidence', 'contrast', 'connection']),
  route('/record/affiliations/', 'Affiliations', 'Affiliation register', 'Each partner organization and named person the public site presents, carried with the status of the evidence behind it rather than as a completed table.', 'Institution / affiliations', ['orientation', 'evidence', 'contrast', 'connection']),
  route('/record/marketing/', 'Market profile', 'INSTAR Lab positioning and public claims', 'A readable register of the language, audiences, research domains, and next actions used across the public site.', 'Positioning / claims', ['orientation', 'evidence', 'contrast', 'connection']),
  route('/record/journeys/', 'Decision briefs', 'Role-specific paths through the INSTAR site', 'Short routes for program officers, collaborators, researchers, fellows, and supporters who need to decide what to inspect next.', 'Wayfinding / decisions', ['orientation', 'sequence', 'participation', 'connection']),
  route('/record/federal/', 'Federal record', 'Federal and institutional research posture', 'The public evidence for INSTAR Lab\'s federal, institutional, sponsored-program, and STTR pathways—without implying an award, contract, or credential that is not published.', 'Research / acquisition', ['orientation', 'evidence', 'sequence', 'contrast', 'connection']),
  route('/record/verify/', 'Source register', 'Source register and verification limits', 'A dated-in-practice register of the repository sources behind this record room, including what is verified, what requires review, and what is not public.', 'Evidence / limits', ['orientation', 'evidence', 'contrast', 'connection']),
  route('/record/corrections/', 'Corrections', 'Corrections register', 'The claims this site published and then withdrew, each with what was wrong, what the site says now, the date the correction landed, and the commit that landed it.', 'Accountability / corrections', ['orientation', 'evidence', 'sequence', 'connection']),
  route('/record/files/', 'Documents', 'Public documents and asset register', 'A focused index of public documents, route-backed content, fonts, logos, and image policy records used by the site.', 'Files / lineage', ['orientation', 'evidence', 'observation', 'connection']),
  route('/record/nav/', 'Site map', 'INSTAR Lab public site link inventory', 'The complete source-derived route inventory for the current public website, grouped by family and searchable in the browser.', 'Routes / navigation', ['orientation', 'participation', 'evidence', 'connection']),
  route('/record/metrics/', 'Content inventory', 'Captured page inventory: content, media, and metadata', 'Build-time measurements from the route manifests, article collection, and public media policy—not claims about audience traffic or research outcomes.', 'Measurements / inventory', ['orientation', 'evidence', 'sequence', 'connection']),
  route('/record/screens/', 'Visual archive', 'See the public site in context', 'Representative source visuals from the public AVIF library, linked back to the pages where readers encounter them. These are source visuals, not screenshot captures.', 'Media / observation', ['orientation', 'observation', 'evidence', 'connection']),
  route('/record/ops/', 'Business status', 'Static delivery and operational readiness', 'A public-facing view of the site\'s delivery model, content ownership boundaries, forms posture, and the checks that protect the static build.', 'Operations / readiness', ['orientation', 'sequence', 'evidence', 'contrast', 'connection']),
  route('/record/style/', 'Brand guide', 'INSTAR Lab visual system and public assets', 'A compact reference for the current INSTAR visual language: logo, type, palette, spacing, image policy, and accessible interaction principles.', 'Design system / assets', ['orientation', 'observation', 'evidence', 'participation', 'connection']),
] as const satisfies readonly RecordRoute[];

export const recordNavigation = recordRoutes.map(({ path, label }) => ({ path, label })) as readonly { path: RecordRoute['path']; label: string }[];

export function recordRouteAtPath(path: string): RecordRoute {
  const normalized = path.endsWith('/') ? path : `${path}/`;
  const found = recordRoutes.find((entry) => entry.path === normalized);
  if (!found) throw new Error(`Unknown record route: ${path}`);
  return found;
}

const sectionPages = [
  { path: '/research/', title: 'Research', family: 'Research', description: 'Research portfolio and sponsored-program pathways.', source: 'src/pages/research/index.astro' },
  { path: '/technology/computer-science/', title: 'Technology', family: 'Technology', description: 'Technology research and applied capability pages.', source: 'src/pages/technology/[slug]/index.astro' },
  { path: '/sciences/physics/', title: 'Sciences', family: 'Sciences', description: 'Science-domain route family and subject pages.', source: 'src/pages/sciences/[slug]/index.astro' },
  { path: '/community/about-us/', title: 'Community', family: 'Community', description: 'Community, leadership, partner, and contact pathways.', source: 'src/pages/community/[slug]/index.astro' },
  { path: '/labs/sovereign-ai/', title: 'Labs', family: 'Labs', description: 'Named research laboratory pages.', source: 'src/pages/labs/[slug]/index.astro' },
  { path: '/tech-transfer/portfolio/', title: 'Technology Transfer', family: 'Tech transfer', description: 'Enterprise R&D, portfolio, STTR, and events.', source: 'src/pages/tech-transfer/[slug]/index.astro' },
] as const;

const corePageRecords: readonly SitePageRecord[] = Object.values(coreRoutes).map((entry) => ({
  path: entry.path,
  title: entry.title,
  family: entry.key === 'home' ? 'Home' : 'Core',
  kind: 'core',
  description: entry.description,
  source: `src/data/core-routes.ts (${entry.key})`,
  indexable: entry.robots.startsWith('index'),
}));

const editorialPageRecords: readonly SitePageRecord[] = editorialRoutes.map((entry) => ({
  path: entry.path,
  title: entry.title,
  family: familyLabel(entry.family),
  kind: 'editorial',
  description: entry.description,
  source: entry.family === 'news' ? 'src/content/articles/ + src/data/workstream5/manifest.ts' : 'src/data/editorialRoutes.ts',
  indexable: true,
}));

const recordPageRecords: readonly SitePageRecord[] = recordRoutes.map((entry) => ({
  path: entry.path,
  title: entry.title,
  family: 'Public record',
  kind: 'record',
  description: entry.description,
  source: 'src/pages/record/ + src/data/record.ts',
  indexable: true,
}));

const pageMap = new Map<string, SitePageRecord>();
([...corePageRecords, ...editorialPageRecords, ...sectionPages.map((entry) => ({ ...entry, kind: 'section' as const, indexable: true })), ...recordPageRecords] as readonly SitePageRecord[]).forEach((entry) => {
  if (!pageMap.has(entry.path)) pageMap.set(entry.path, entry);
});

export const sitePageRecords: readonly SitePageRecord[] = [...pageMap.values()].sort((left, right) => left.path.localeCompare(right.path));

export const recordJourneys: readonly RecordJourney[] = [
  { id: 'program-officer', label: 'Program officer', question: 'Where does a mission-driven research question fit, and what should I inspect before opening a conversation?', steps: [{ label: 'Current programs', href: '/research/current-programs/' }, { label: 'Research process', href: '/research/our-process/' }, { label: 'Facilities', href: '/research/facilities/' }, { label: 'Federal posture', href: '/record/federal/' }], nextAction: { label: 'Discuss a research requirement', href: '/contact-us/' } },
  { id: 'technical-collaborator', label: 'Technical collaborator', question: 'Which lab, science, or technology route best matches the work we need to do together?', steps: [{ label: 'Research portfolio', href: '/research/innovation/' }, { label: 'Labs', href: '/labs/sovereign-ai/' }, { label: 'Technology map', href: '/technology/computer-science/' }, { label: 'Work with INSTAR', href: '/community/work-with-us/' }], nextAction: { label: 'Compare collaboration paths', href: '/community/work-with-us/' } },
  { id: 'researcher', label: 'Researcher or fellow', question: 'What kind of work and preparation should I understand before applying or reaching out?', steps: [{ label: 'Fellowship', href: '/fellowship/' }, { label: 'Open data', href: '/research/open-data/' }, { label: 'Current briefs', href: '/news/' }, { label: 'Careers', href: '/community/careers/' }], nextAction: { label: 'Review the fellowship pathway', href: '/fellowship/' } },
  { id: 'institutional-partner', label: 'Institutional partner', question: 'How can a nonprofit research institute, company, or sponsor find the right engagement model?', steps: [{ label: 'Partner with INSTAR', href: '/community/partner/' }, { label: 'STTR programs', href: '/tech-transfer/sttr-programs/' }, { label: 'Enterprise R&D', href: '/tech-transfer/enterprise-rd/' }, { label: 'Portfolio', href: '/tech-transfer/portfolio/' }], nextAction: { label: 'Start a partnership conversation', href: '/contact-us/' } },
  { id: 'supporter', label: 'Supporter', question: 'What is the institution, what does it work on, and where can support begin?', steps: [{ label: 'Mission', href: '/mission/' }, { label: 'About INSTAR', href: '/community/about-us/' }, { label: 'Research themes', href: '/research/current-programs/' }, { label: 'Support', href: '/community/support/' }], nextAction: { label: 'Explore ways to support', href: '/community/support/' } },
] as const;

export const recordFiles: readonly RecordFile[] = [
  { label: 'IRS determination letter (EIN 85-0845517)', path: '/docs/irs-determination-letter-85-0845517.pdf', kind: 'PDF', status: 'published', note: 'Served at this stable URL with no session, login, or search form. Reading the served document confirms the employer identification number, the §501(c)(3) exemption, the §170(b)(1)(A)(vi) public-charity classification, the 27 April 2020 effective date, and the Marietta address. The legal-status register cites it field by field.' },
  { label: 'INSTAR Lab logo', path: '/img/logo/instar.svg', kind: 'SVG mark', status: 'published', note: 'Used by the shared public-site header.' },
  { label: 'Self-hosted display and body fonts', path: '/fonts/', kind: 'WOFF2', status: 'published', note: 'Raleway, Roboto, and Lato files are served locally for the existing theme.' },
  { label: 'Editorial image library', path: '/img/pages/', kind: 'AVIF media', status: 'published', note: 'Page assets are referenced through the repository media policy; individual provenance states remain asset-specific.' },
  { label: 'Research brief source files', path: 'src/content/articles/', kind: 'Markdown collection', status: 'source-only', note: 'Eight published briefs are rendered under /news/; their article records remain the authoring source.' },
  { label: 'Public media policy', path: 'src/data/media/public-media-policy.json', kind: 'JSON manifest', status: 'source-only', note: 'Defines media roles, dimensions, loading, alt decisions, and provenance notes used at build time.' },
] as const;

export const recordSourceRegister: readonly RecordSource[] = [
  { id: 'SRC-001', label: 'Public site identity', locator: 'src/data/seo/site.ts', status: 'verified-in-repository', supports: 'The public organization name, contact details, address, site origin, and published nonprofit description used by the shared shell.', limits: 'Repository verification is not a substitute for an external legal or registration check.' },
  { id: 'SRC-002', label: 'Route manifests', locator: 'src/data/core-routes.ts, src/data/editorialRoutes.ts, src/data/workstream5/manifest.ts', status: 'verified-in-repository', supports: 'The route inventory, titles, descriptions, families, and page-signature metadata shown in this record room.', limits: 'Counts describe the built source graph, not traffic, conversions, awards, or research outcomes.' },
  { id: 'SRC-003', label: 'Navigation manifest', locator: 'src/data/siteNavigation.ts', status: 'verified-in-repository', supports: 'Primary navigation, footer links, and the added Public Record entry.', limits: 'A navigation link proves discoverability, not that every downstream external service is available.' },
  { id: 'SRC-004', label: 'Public media policy', locator: 'src/data/media/public-media-policy.json and src/data/media/README.md', status: 'review-required', supports: 'Media roles, dimensions, responsive behavior, and per-asset provenance fields.', limits: 'The repository notes that many image and partner-asset rights/provenance fields remain unverified.' },
  { id: 'SRC-005', label: 'Served IRS determination letter', locator: '/docs/irs-determination-letter-85-0845517.pdf', status: 'verified-in-repository', supports: 'The employer identification number, the §501(c)(3) exemption, the §170(b)(1)(A)(vi) public-charity classification, a ruling effective 27 April 2020, and the Marietta address — read from the served document itself.', limits: 'It is a scanned document, so its fields are read from the artifact rather than parsed from it. It establishes the classification as of the ruling; it is not a current-status check and it is not a Form 990 of any year.' },
  { id: 'SRC-006', label: 'Separate records corpus', locator: 'Separate repository source corpus (not published)', status: 'not-public', supports: 'The existence of separately maintained governance, policy, training, template, institutional, and research source material.', limits: 'Branch status and publication authority are not established for this website; private legal, tax, agreement, and personnel content is intentionally not reproduced.' },
  { id: 'SRC-007', label: 'Management attestation of the measured zeros', locator: 'src/data/record-bi/current.json', status: 'verified-in-repository', supports: 'The two measured zeros published in the operational snapshot — no grant awarded to INSTAR Lab, and no peer-reviewed publication naming an INSTAR Lab author — attested by the chief executive officer on 2026-09-13.', limits: 'A management attestation is not a board resolution, an audited statement, or an external filing. It records what the institution approved for publication, and it is the weakest of the three approval bases the snapshot can carry.' },
  { id: 'SRC-008', label: 'Institutional registers', locator: 'src/data/record-registers/', status: 'verified-in-repository', supports: 'The corrections register, the legal-status fields, the board and policy register, and the affiliation register — each row carrying the basis that establishes it and the limit that basis carries.', limits: 'A register row marked unverified or not reported is a statement about the evidence, not about the claim. No row in those registers is an external verification of the thing it names.' },
] as const;

/**
 * Authoritative external records about the institution itself.
 *
 * These are published the way the repository publishes everything else: the
 * figure belongs to the source, the attribution travels with it, and the
 * limitation is stated next to the number rather than buried. The Record Room
 * does not restate a filing's figures as its own operational measures — the
 * BI snapshot in `src/data/record-bi/current.json` publishes only what an
 * approver inside the institution has signed, and it marks everything else
 * "Not reported".
 */
export const recordExternalSources: readonly RecordExternalSource[] = [
  {
    id: 'EXT-001',
    label: 'Ohio Attorney General charitable registration record',
    publisher: 'Ohio Attorney General — Charitable Registration',
    locator: 'https://charitableregistration.ohioago.gov/Charities/OrganizationDetails?Id=12174620',
    retrievedAt: '2026-09-13',
    publishes: 'For the most recent filing year on record, the Ohio Attorney General publishes: gross revenue $49,000; total expenses $49,000; program service expenses $49,000 (100.00%); total assets $0; three board members; a conflict-of-interest policy on file; no audited financial statements; and a status of in compliance with registration requirements.',
    limits: 'A state charitable-registration filing is a self-reported annual filing, not an audit. It describes the filing year rather than a current balance, it reports a filing classification rather than the institution\'s own accounting, and the page is a third-party system that INSTAR Lab does not control.',
    fallback: { label: 'Ohio Attorney General charity search', locator: 'https://charitableregistration.ohioago.gov/Charities/ResearchCharities' },
  },
  {
    id: 'EXT-002',
    label: 'Nonprofit Explorer record by EIN',
    publisher: 'ProPublica',
    locator: 'https://projects.propublica.org/nonprofits/organizations/850845517',
    retrievedAt: '2026-09-13',
    publishes: 'The entry is keyed to INSTAR Lab\'s IRS employer identification number (85-0845517) and identifies the organization.',
    note: 'This page renders "No Financial Data Available", which reads as a hole unless the reason is stated: the Nonprofit Explorer reproduces digitized Form 990 filings and excludes organizations that file the 990-N (e-Postcard) instead. The entry is cited here as an independent identity and filing-status check, not as a financial source.',
    limits: 'Because no Form 990 is reproduced there, this page cannot confirm or contradict any figure in the filing linked above, and its own absence of data is not evidence that no filing exists.',
  },
] as const;

export const recordStats = {
  sitePages: sitePageRecords.length,
  indexablePages: sitePageRecords.filter((entry) => entry.indexable).length,
  editorialPages: editorialPageRecords.length,
  researchBriefs: editorialRoutes.filter((entry) => entry.family === 'news' && entry.path !== '/news/').length,
  publicMediaPolicies: publicMediaPolicies.length,
  routeFamilies: new Set(sitePageRecords.map((entry) => entry.family)).size,
  recordPages: recordPageRecords.length,
  sourceFiles: recordSourceRegister.length,
  buildSurface: 'Static Astro output for GitHub Pages-compatible delivery',
} as const;

const recordVisualEntries: readonly RecordVisual[] = [
  { id: 'visual-research', title: 'Research as a connected portfolio', href: '/research/innovation/', src: '/img/banners/research-innovation.avif', alt: 'Abstract blue research image used on the INSTAR research innovation route.', caption: 'A route-backed visual from the public AVIF library; the page copy supplies the research context and limits.', width: 1170, height: 400, mediaId: 'media:record-research-innovation', mediaRole: 'record-reference', source: 'Existing INSTAR public media asset; original source is not recorded.', license: 'Unverified; confirm ownership or license before publication.', reuseReason: 'Record visual archive reference to the canonical research route.' },
  { id: 'visual-data', title: 'Open data and public datasets', href: '/research/open-data/', src: '/img/slider/geospatial.avif', alt: 'Geospatial image used to introduce INSTAR open-data research.', caption: 'Observation and evidence meet in the open-data route.', width: 1920, height: 800, mediaId: 'media:record-open-data', mediaRole: 'record-reference', source: 'Existing INSTAR public media asset; original source is not recorded.', license: 'Unverified; confirm ownership or license before publication.', reuseReason: 'Record visual archive reference to the canonical open-data route.' },
  { id: 'visual-sovereign', title: 'Sovereign AI laboratory', href: '/labs/sovereign-ai/', src: '/img/banners/labs-sovereign-ai.avif', alt: 'Dark blue visual for the Sovereign AI Laboratory route.', caption: 'A named lab route in the current public research surface.', width: 1170, height: 400, mediaId: 'media:record-sovereign-ai', mediaRole: 'record-reference', source: 'Existing INSTAR public media asset; original source is not recorded.', license: 'Unverified; confirm ownership or license before publication.', reuseReason: 'Record visual archive reference to the canonical Sovereign AI route.' },
  { id: 'visual-community', title: 'About the institution', href: '/community/about-us/', src: '/img/pages/about-us/section-1-aboutus.avif', alt: 'INSTAR community image used in the About Us page.', caption: 'The community route carries institutional context and a path to leadership and partnership.', width: 570, height: 370, mediaId: 'media:record-about-us', mediaRole: 'record-reference', source: 'Existing INSTAR public media asset; original source is not recorded.', license: 'Unverified; confirm ownership or license before publication.', reuseReason: 'Record visual archive reference to the canonical About Us route.' },
  { id: 'visual-fellowship', title: 'Research fellowships', href: '/fellowship/', src: '/img/pages/fellowship/inline-1.avif', alt: 'Fellowship image used in the researcher pathway.', caption: 'A visual cue for prospective fellows, paired with the program comparison and application links.', width: 570, height: 370, mediaId: 'media:record-fellowship', mediaRole: 'record-reference', source: 'Existing INSTAR public media asset; original source is not recorded.', license: 'Unverified; confirm ownership or license before publication.', reuseReason: 'Record visual archive reference to the canonical fellowship route.' },
  { id: 'visual-quantum', title: 'Quantum research', href: '/technology/quantum-computing/', src: '/img/pages/quantum-computing/hero.avif', alt: 'Quantum computing image used in the technology route.', caption: 'One of the public technology pathways recorded in the route graph.', width: 770, height: 400, mediaId: 'media:record-quantum', mediaRole: 'record-reference', source: 'Existing INSTAR public media asset; original source is not recorded.', license: 'Unverified; confirm ownership or license before publication.', reuseReason: 'Record visual archive reference to the canonical quantum technology route.' },
] as const;

// Canonical policy roles and dimensions outrank archive presentation defaults.
export const recordVisuals: readonly RecordVisual[] = recordVisualEntries.map((visual) => {
  const media = publicMediaFor(visual.src);
  return media ? { ...visual, width: media.dimensions.width, height: media.dimensions.height,
    mediaRole: media.role, source: media.provenance.source, license: media.provenance.license } : visual;
});

export const recordMeta = {
  name: siteIdentity.name,
  title: 'INSTAR Lab public record',
  description: 'A source-conscious index of INSTAR Lab\'s public identity, research pathways, website structure, media, and evidence boundaries.',
  origin: siteOrigin,
  routeInventory: recordRoutes.map(({ path, label }) => ({ path, label })),
  generatedFiles: ['/record/bi.json', '/record/graph.json', '/record/journeys.json', '/record/manifest.json', '/record/meta.json', '/record/page-metrics.json'],
  evidencePolicy: 'Repository-backed content is distinguished from claims requiring human or external verification.',
} as const;

export const recordGraph = {
  nodes: sitePageRecords.map(({ path, title, family, kind }) => ({ id: path, label: title, family, kind })),
  edges: recordJourneys.flatMap((journey) => journey.steps.slice(0, -1).map((step, index) => ({ source: step.href, target: journey.steps[index + 1]?.href ?? journey.nextAction.href, journey: journey.id }))),
} as const;

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { W5Family, W5MediaReference, W5RouteRecord } from './types';

const projectRoot = process.cwd();

function readLegacySource(sourceFile: string): string {
  return readFileSync(resolve(projectRoot, sourceFile), 'utf8');
}

function normalizeAssetPath(source: string): string {
  return source.replace(/^(?:\.\.\/)+/, '/').replace(/^\/img\//, '/img/');
}

function mediaRole(src: string): W5MediaReference['role'] {
  if (src.includes('/brand-logo/')) return 'system-mark';
  if (src.includes('/banners/') || /\/hero\./.test(src)) return 'orientation';
  return 'legacy-inline';
}

export function mediaFromLegacy(sourceFile: string): readonly W5MediaReference[] {
  const source = readLegacySource(sourceFile);
  const seen = new Set<string>();
  const references: W5MediaReference[] = [];

  for (const match of source.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)) {
    const rawSrc = match[1];
    if (!rawSrc || !rawSrc.includes('/img/')) continue;
    const src = normalizeAssetPath(rawSrc);
    if (seen.has(src)) continue;
    seen.add(src);
    const role = mediaRole(src);
    references.push({
      src,
      role,
      altDecision: 'preserved-in-legacy-markup',
      ...(role === 'system-mark' ? { reuseReason: 'shared-consortium-mark' } : {}),
    });
  }

  return references;
}

function route(
  record: Omit<W5RouteRecord, 'media'>,
): W5RouteRecord {
  return { ...record, media: mediaFromLegacy(record.sourceFile) };
}

export const workstream5Routes = [
  route({
    path: '/community/about-us/',
    sourceFile: 'community/about-us/index.html',
    family: 'community',
    title: 'About Us — INSTAR Lab Community',
    description: 'Learn who we are: INSTAR Lab is an independent 501(c)(3) nonprofit research institute in Marietta, Ohio, led by scientists, engineers, and researchers advancing public-benefit science.',
    signature: ['orientation', 'observation', 'connection'],
    pageJob: 'Orient readers to the institution, its mission, team, history, and public-benefit commitments.',
    readyAction: 'Meet the leadership and explore the research community.',
    earlyAction: 'Start with the mission and organizational story.',
  }),
  route({
    path: '/community/careers/',
    sourceFile: 'community/careers/index.html',
    family: 'community',
    title: 'Careers at INSTAR Lab — Research & Science Jobs',
    description: 'Explore career and research opportunities at INSTAR Lab, an independent nonprofit research institute advancing AI, quantum science, health, energy, and space exploration.',
    signature: ['orientation', 'evidence', 'participation'],
    pageJob: 'Help prospective researchers and staff assess the kinds of work, roles, and expectations available at INSTAR.',
    readyAction: 'Express interest in a research or technical role.',
    earlyAction: 'Review the role families and fellowship pathway.',
  }),
  route({
    path: '/community/contact/',
    sourceFile: 'community/contact/index.html',
    family: 'community',
    title: 'Contact INSTAR Lab — Partnerships, Giving & Inquiries',
    description: 'Contact INSTAR Lab about research partnerships, sponsored programs, philanthropic giving, fellowship applications, or general inquiries. Based in Marietta, Ohio.',
    signature: ['orientation', 'participation', 'connection'],
    pageJob: 'Route a reader’s question to the right INSTAR contact path with clear expectations and a usable form.',
    readyAction: 'Send a message with the relevant inquiry type.',
    earlyAction: 'Use the direct phone, email, or address details.',
    legacyScripts: ['/community/contact/intake.js'],
  }),
  route({
    path: '/community/fellowship/',
    sourceFile: 'community/fellowship/index.html',
    family: 'community',
    title: 'Research Fellowship — INSTAR Lab Community',
    description: 'This page has moved to the INSTAR Fellowship.',
    signature: ['orientation', 'connection', 'participation'],
    pageJob: 'Preserve the established community URL while directing readers to the canonical fellowship application route.',
    readyAction: 'Continue to the canonical INSTAR Fellowship page.',
    earlyAction: 'Read the move notice and follow the destination link.',
    redirectTo: '/fellowship/',
  }),
  route({
    path: '/community/leadership/',
    sourceFile: 'community/leadership/index.html',
    family: 'community',
    title: 'Leadership — INSTAR Lab',
    description: 'Meet the scientists, engineers, and researchers who lead INSTAR Lab — an independent nonprofit research institute in Marietta, Ohio advancing applied science across multiple domains.',
    signature: ['orientation', 'observation', 'evidence'],
    pageJob: 'Introduce governance and the people accountable for the Lab’s research quality and institutional direction.',
    readyAction: 'Review the leadership and board profiles.',
    earlyAction: 'Understand the governance model and research roles.',
  }),
  route({
    path: '/community/partner/',
    sourceFile: 'community/partner/index.html',
    family: 'community',
    title: 'Partner With INSTAR Lab — Research & Philanthropy',
    description: 'Partner with INSTAR Lab, a 501(c)(3) nonprofit. Explore sponsored research, institutional partnerships, and tax-deductible giving to advance public-benefit science.',
    signature: ['orientation', 'evidence', 'participation'],
    pageJob: 'Explain partnership and giving pathways so an institution can decide how to begin a conversation.',
    readyAction: 'Send a partnership or sponsorship inquiry.',
    earlyAction: 'Compare the partnership, giving, and research pathways.',
    legacyScripts: ['/community/partner/partner-form.js'],
  }),
  route({
    path: '/community/support/',
    sourceFile: 'community/support/index.html',
    family: 'community',
    title: 'Give to INSTAR Lab — One-Time Gifts & Friends Membership',
    description: 'Support INSTAR Lab, a 501(c)(3) nonprofit. Make a tax-deductible one-time donation or join the Friends of INSTAR recurring membership — your support sustains independent public-benefit science.',
    signature: ['orientation', 'evidence', 'participation'],
    pageJob: 'Make the case for independent public-benefit research and provide direct, trusted giving choices.',
    readyAction: 'Choose a one-time gift or recurring Friends membership.',
    earlyAction: 'Read why diversified public support matters to the research.',
  }),
  route({
    path: '/community/work-with-us/',
    sourceFile: 'community/work-with-us/index.html',
    family: 'community',
    title: 'Work With INSTAR Lab — Collaboration Opportunities',
    description: 'Explore ways to work with INSTAR Lab: from research collaborations and STTR partnerships to enterprise R&D engagements and co-investigation on sponsored programs.',
    signature: ['orientation', 'contrast', 'participation'],
    pageJob: 'Help researchers, institutions, industry, and government identify a collaboration model that fits their needs.',
    readyAction: 'Start a collaboration conversation.',
    earlyAction: 'Find the engagement pathway that matches your organization.',
  }),
  route({
    path: '/fellowship/',
    sourceFile: 'fellowship/index.html',
    family: 'fellowship',
    title: 'INSTAR Fellowship — Open Citizen-Scientist Program',
    description: 'Apply for the INSTAR Fellowship — an open citizen-scientist program for curious researchers at every level. No minimum degree required; selection is based on fit with INSTAR’s research culture.',
    signature: ['orientation', 'evidence', 'sequence', 'participation'],
    pageJob: 'Give a prospective fellow enough program detail to assess fit, expectations, and the application decision.',
    readyAction: 'Complete the fellowship application.',
    earlyAction: 'Review eligibility, time commitment, fields, and program structure.',
  }),
  route({
    path: '/labs/biometric-security/',
    sourceFile: 'labs/biometric-security/index.html',
    family: 'labs',
    title: 'Biometric Security Systems — INSTAR Lab',
    description: 'INSTAR Lab researches multi-modal biometric authentication fusing genomic markers, neural gait analysis, and vascular topology for high-assurance identity verification systems.',
    signature: ['orientation', 'evidence', 'contrast', 'connection'],
    pageJob: 'Explain the lab’s research thesis, security mechanism, constraints, and collaboration path.',
    readyAction: 'Discuss a research or technology-transfer collaboration.',
    earlyAction: 'Inspect the research approach and its open-data foundations.',
  }),
  route({
    path: '/labs/cognitive-ai/',
    sourceFile: 'labs/cognitive-ai/index.html',
    family: 'labs',
    title: 'Cognitive AI & Persona Systems — INSTAR Lab',
    description: 'INSTAR Lab investigates psycholinguistic modeling, personality architectures, and AI personification through inference shaping — advancing human-aligned cognitive AI systems.',
    signature: ['orientation', 'observation', 'evidence', 'connection'],
    pageJob: 'Make the cognitive-AI research problem legible through its mechanisms, applications, limits, and invitation to collaborate.',
    readyAction: 'Connect about cognitive-AI research.',
    earlyAction: 'Understand the lab’s research questions and methods.',
  }),
  route({
    path: '/labs/sovereign-ai/',
    sourceFile: 'labs/sovereign-ai/index.html',
    family: 'labs',
    title: 'Sovereign AI Laboratory — INSTAR Lab',
    description: 'INSTAR Lab’s Sovereign AI Laboratory researches air-gapped frontier model training, secure inference, and autonomous reasoning on private infrastructure for government and defense partners.',
    signature: ['orientation', 'sequence', 'evidence', 'connection'],
    pageJob: 'Explain how secure, private infrastructure changes the design space for frontier AI research and deployment.',
    readyAction: 'Explore a sovereign-infrastructure partnership.',
    earlyAction: 'Read the architecture, safety, and open-data rationale.',
  }),
  route({
    path: '/news/',
    sourceFile: 'news/index.html',
    family: 'news',
    title: 'News — INSTAR Lab',
    description: 'Updates, announcements, and research highlights from INSTAR Lab — an independent 501(c)(3) nonprofit research institute.',
    signature: ['orientation', 'observation', 'connection'],
    pageJob: 'Orient readers to current INSTAR research briefs and give each story a meaningful reason to open.',
    readyAction: 'Open the research brief that matches the reader’s question.',
    earlyAction: 'Scan the research themes and recent highlights.',
  }),
  route({
    path: '/news/clinical-ai-safety/',
    sourceFile: 'news/clinical-ai-safety/index.html',
    family: 'news',
    title: 'Clinical AI Safety Research — INSTAR Lab',
    description: 'An INSTAR Lab research brief on how AI can improve patient safety and clinical workflows — and why rigorous safety evaluation and human oversight are essential before clinical deployment.',
    signature: ['orientation', 'observation', 'evidence', 'contrast', 'connection'],
    pageJob: 'Examine the promise, failure modes, and oversight requirements of clinical AI before deployment.',
    readyAction: 'Connect about clinical AI safety evaluation.',
    earlyAction: 'Read the promise-and-stakes framing.',
  }),
  route({
    path: '/news/formal-methods-safety-critical-trust/',
    sourceFile: 'news/formal-methods-safety-critical-trust/index.html',
    family: 'news',
    title: 'Formal Methods and Trust in Safety-Critical Software — INSTAR Lab',
    description: 'An INSTAR Lab research brief on formal verification for safety-critical and high-assurance software — why testing alone cannot establish correctness, and how mathematical proof closes the gap.',
    signature: ['orientation', 'evidence', 'contrast', 'connection'],
    pageJob: 'Distinguish testing from formal assurance and show where machine-checkable proof matters most.',
    readyAction: 'Explore the formal methods research program.',
    earlyAction: 'Start with the testing-versus-proof distinction.',
  }),
  route({
    path: '/news/hpc-infrastructure-for-ai/',
    sourceFile: 'news/hpc-infrastructure-for-ai/index.html',
    family: 'news',
    title: 'HPC Infrastructure for AI — INSTAR Lab',
    description: 'An INSTAR Lab research brief on GPU-accelerated computing, sovereign on-premises AI infrastructure, and INSTAR’s applied research into accessible frontier AI capability.',
    signature: ['orientation', 'evidence', 'sequence', 'connection'],
    pageJob: 'Explain why compute architecture is itself a research problem for accessible and sovereign AI.',
    readyAction: 'Discuss infrastructure or applied-research collaboration.',
    earlyAction: 'Understand the compute and governance constraints.',
  }),
  route({
    path: '/news/legal-foundations-tech-governance/',
    sourceFile: 'news/legal-foundations-tech-governance/index.html',
    family: 'news',
    title: 'Legal Foundations for Emerging Technology Governance — INSTAR Lab',
    description: 'An INSTAR Lab research brief on how legal and regulatory systems govern fast-moving technologies such as AI, biotechnology, and quantum computing.',
    signature: ['orientation', 'evidence', 'contrast', 'connection'],
    pageJob: 'Frame technology governance as a research problem grounded in existing legal systems and primary sources.',
    readyAction: 'Explore science and technology law research.',
    earlyAction: 'Read the regulatory-lag framing.',
  }),
  route({
    path: '/news/materials-science-energy-transition/',
    sourceFile: 'news/materials-science-energy-transition/index.html',
    family: 'news',
    title: 'Materials Science and the Energy Transition — INSTAR Lab',
    description: 'An INSTAR Lab research brief on the materials science underlying energy storage and generation — battery chemistries, catalysts, photovoltaics, and computational materials discovery.',
    signature: ['orientation', 'observation', 'evidence', 'connection'],
    pageJob: 'Connect materials-level tradeoffs to energy-system design and the evidence needed for scale.',
    readyAction: 'Explore materials and energy research.',
    earlyAction: 'Follow the path from atoms to systems.',
  }),
  route({
    path: '/news/open-data-research-philosophy/',
    sourceFile: 'news/open-data-research-philosophy/index.html',
    family: 'news',
    title: 'Why an Independent Research Institute Commits to Open Data — INSTAR Lab',
    description: 'An INSTAR Lab research brief on why open, reproducible datasets are a research philosophy rather than a formality — and why that commitment matters most for an independent nonprofit institute.',
    signature: ['orientation', 'evidence', 'contrast', 'connection'],
    pageJob: 'Make open data legible as institutional design and as the practical condition for reproducible research.',
    readyAction: 'Explore the open-data approach.',
    earlyAction: 'Start with the reproducibility problem.',
  }),
  route({
    path: '/news/precision-agriculture-open-data/',
    sourceFile: 'news/precision-agriculture-open-data/index.html',
    family: 'news',
    title: 'Precision Agriculture and Open Agricultural Data — INSTAR Lab',
    description: 'An INSTAR Lab research brief on sensor networks, remote sensing, and soil microbiome research in precision agriculture — and why open agricultural datasets from USDA and FAO are foundational to credible research.',
    signature: ['orientation', 'observation', 'evidence', 'connection'],
    pageJob: 'Show how sensing, soil science, and open data combine into a testable precision-agriculture program.',
    readyAction: 'Explore the agriculture research program.',
    earlyAction: 'Read the remote-sensing and soil-science sections.',
  }),
  route({
    path: '/news/quantum-sensing-breakthroughs/',
    sourceFile: 'news/quantum-sensing-breakthroughs/index.html',
    family: 'news',
    title: 'Quantum Sensing Breakthroughs — INSTAR Lab',
    description: 'An INSTAR Lab research perspective on advances in qubit coherence, quantum error correction, and the path toward practical quantum sensing and computation.',
    signature: ['orientation', 'evidence', 'observation', 'connection'],
    pageJob: 'Translate progress in coherence and error correction into a practical quantum-sensing research question.',
    readyAction: 'Connect about applied quantum research.',
    earlyAction: 'Start with the practical threshold for quantum systems.',
  }),
  route({
    path: '/tech-transfer/enterprise-rd/',
    sourceFile: 'tech-transfer/enterprise-rd/index.html',
    family: 'tech-transfer',
    title: 'Enterprise R&D — INSTAR Lab Technology Transfer',
    description: 'INSTAR Lab is a 501(c)(3) research institute that matures applied research in AI, secure software, sensing, simulation, and learning science — then transitions it to partner companies who commercialize it. A repeatable research-to-product pipeline aligned with the intent of SBIR/STTR programs.',
    signature: ['orientation', 'sequence', 'evidence', 'participation'],
    pageJob: 'Explain the research-to-product model and the stage gates that protect scientific quality and partner fit.',
    readyAction: 'Discuss an enterprise R&D or commercialization pathway.',
    earlyAction: 'Walk through the four technology-transfer stages.',
  }),
  route({
    path: '/tech-transfer/portfolio/',
    sourceFile: 'tech-transfer/portfolio/index.html',
    family: 'tech-transfer',
    title: 'Research Portfolio — INSTAR Lab Technology Transfer',
    description: 'INSTAR Lab’s research-to-commercialization portfolio — INSTAR-affiliated researchers contribute the applied R&D behind partner-company products spanning autonomous software engineering, multi-domain sensing, generative AI inference, decision intelligence, and learning science. Several programs at SBIR/STTR readiness.',
    signature: ['orientation', 'observation', 'evidence', 'connection'],
    pageJob: 'Let partners inspect the continuum from active research programs to products and commercialization opportunities.',
    readyAction: 'Explore a portfolio program or contact INSTAR.',
    earlyAction: 'Scan the portfolio by capability and project.',
  }),
  route({
    path: '/tech-transfer/sttr-programs/',
    sourceFile: 'tech-transfer/sttr-programs/index.html',
    family: 'tech-transfer',
    title: 'STTR Programs — INSTAR Lab Technology Transfer',
    description: 'INSTAR Lab is a qualified STTR research institution partner. We bring 501(c)(3) nonprofit standing, multidisciplinary research depth, and a registered SAM/CAGE entity to small-business STTR proposals across AI, quantum, health, HPC, energy, space, and materials.',
    signature: ['orientation', 'evidence', 'sequence', 'participation'],
    pageJob: 'Help a small business understand the STTR mechanism and when to involve INSTAR as its research institution partner.',
    readyAction: 'Contact INSTAR before a solicitation closes.',
    earlyAction: 'Review the STTR mechanism and engagement steps.',
  }),
  route({
    path: '/tech-transfer/workshops-events/',
    sourceFile: 'tech-transfer/workshops-events/index.html',
    family: 'tech-transfer',
    title: 'Workshops & Events — INSTAR Lab Technology Transfer',
    description: 'INSTAR convenes researchers, industry partners, federal program officers, and policy stakeholders through workshops, technical seminars, and knowledge-transfer events that accelerate translational R&D and build collaborative ecosystems.',
    signature: ['orientation', 'observation', 'connection', 'participation'],
    pageJob: 'Orient prospective participants to the knowledge-transfer formats that connect research, partners, and federal programs.',
    readyAction: 'Engage with an INSTAR research event or briefing.',
    earlyAction: 'Compare the event and knowledge-exchange formats.',
  }),
] as const satisfies readonly W5RouteRecord[];

export function routesForFamily(family: W5Family): readonly W5RouteRecord[] {
  return workstream5Routes.filter((record) => record.family === family);
}

export function routeAtPath(path: string): W5RouteRecord {
  const route = workstream5Routes.find((record) => record.path === path);
  if (!route) throw new Error(`Unknown Workstream 5 route: ${path}`);
  return route;
}

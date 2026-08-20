/**
 * Route ledger for the research, technology, and sciences migration.
 *
 * This typed manifest is the source of truth for the research, technology,
 * and sciences route families. It keeps route identity and editorial
 * composition metadata separate from the page renderer.
 */

export type InstarResearchTechnologySciencesFamily =
  | 'research'
  | 'technology'
  | 'sciences';

export type InstarResearchTechnologySciencesComposition =
  | 'consortium-network'
  | 'evidence-index'
  | 'funding-pathway'
  | 'research-narrative'
  | 'data-atlas'
  | 'opportunity-index'
  | 'research-method'
  | 'technology-narrative'
  | 'technology-index'
  | 'science-narrative'
  | 'science-index';

export interface InstarResearchTechnologySciencesRoute {
  family: InstarResearchTechnologySciencesFamily;
  slug: string;
  path: `/${InstarResearchTechnologySciencesFamily}/${string}/`;
  key: string;
  title: string;
  description?: string;
  heading: string;
  banner: string;
  primaryMedia: string | null;
  composition: InstarResearchTechnologySciencesComposition;
  pageSignature: string;
}

export const instarResearchTechnologySciencesRoutes = [
  {
    family: 'research', slug: 'consortium', path: '/research/consortium/', key: 'consortium',
    title: 'INSTAR Consortium — Collaborative Research Network',
    description: 'The INSTAR Consortium unites seven specialized partner organizations to advance applied research across AI, quantum science, health, energy, and the full sciences through shared methodology.',
    heading: 'INSTAR CONSORTIUM', banner: 'img/banners/research-consortium.avif', primaryMedia: '../../img/pages/consortium/hero.avif',
    composition: 'consortium-network', pageSignature: 'network orientation → partner portraits → collaboration CTA',
  },
  {
    family: 'research', slug: 'current-programs', path: '/research/current-programs/', key: 'current-programs',
    title: 'Current Research Programs — INSTAR Lab',
    description: 'Explore active INSTAR Lab research programs spanning AI, quantum science, HPC, health, energy, and space — conducted by principal investigators and postdoctoral fellows.',
    heading: 'CURRENT PROGRAMS', banner: 'img/banners/research-current-programs.avif', primaryMedia: '../../img/pages/current-programs/card-1-current.avif',
    composition: 'evidence-index', pageSignature: 'featured index → evidence rail → partner context → action',
  },
  {
    family: 'research', slug: 'facilities', path: '/research/facilities/', key: 'facilities',
    title: 'Research Facilities — INSTAR Lab', heading: 'FACILITIES', banner: 'img/banners/research-facilities.avif', primaryMedia: '../../img/pages/facilities/card-1.avif',
    composition: 'evidence-index', pageSignature: 'featured index → evidence rail → partner context → action',
  },
  {
    family: 'research', slug: 'funding', path: '/research/funding/', key: 'funding',
    title: 'Funding — INSTAR Lab',
    description: 'INSTAR Lab helps researchers and citizen scientists discover federal funding opportunities and connect with grant-writing support across NSF, NIH, SBIR/STTR, and more.',
    heading: 'FUNDING', banner: 'img/banners/research-funding.avif', primaryMedia: null,
    composition: 'funding-pathway', pageSignature: 'question canvas → funding routes → support sequence → action',
  },
  {
    family: 'research', slug: 'innovation', path: '/research/innovation/', key: 'innovation',
    title: 'Research Innovation — INSTAR Lab',
    description: 'INSTAR Lab pursues innovation at the frontier of science and technology — translating fundamental discoveries into applied outcomes across AI, quantum, health, energy, and HPC.',
    heading: 'INNOVATION', banner: 'img/banners/research-innovation.avif', primaryMedia: '../../img/pages/innovation/section-1.avif',
    composition: 'research-narrative', pageSignature: 'orientation → translational evidence → contrast → themes → partnership',
  },
  {
    family: 'research', slug: 'open-data', path: '/research/open-data/', key: 'open-data',
    title: 'Open Data & Public Datasets — INSTAR Lab',
    description: 'INSTAR Lab grounds research in open, publicly available datasets — federal portals, science agencies, and repositories enabling reproducible, transparent, accountable science.',
    heading: 'OPEN DATA & PUBLIC DATASETS', banner: 'img/banners/research-open-data.avif', primaryMedia: '../../img/slider/geospatial.avif',
    composition: 'data-atlas', pageSignature: 'orientation → source constellation → data practice → fellowship invitation',
  },
  {
    family: 'research', slug: 'opportunities', path: '/research/opportunities/', key: 'opportunities',
    title: 'Research Opportunities — INSTAR Lab',
    description: 'Explore research opportunities at INSTAR Lab including fellowship positions, collaborative programs, STTR engagements, and co-investigation appointments across the Consortium.',
    heading: 'OPPORTUNITIES', banner: 'img/banners/research-opportunities.avif', primaryMedia: '../../img/pages/opportunities/card-1.avif',
    composition: 'opportunity-index', pageSignature: 'orientation → opportunity index → public-data proof → fellowship invitation',
  },
  {
    family: 'research', slug: 'our-process', path: '/research/our-process/', key: 'our-process',
    title: 'Our Research Process — INSTAR Lab', heading: 'OUR PROCESS', banner: 'img/banners/research-our-process.avif', primaryMedia: '../../img/pages/our-process/hero.avif',
    composition: 'research-method', pageSignature: 'orientation → method sequence → evidence → open-data guardrail → invitation',
  },
  {
    family: 'technology', slug: 'augmented-reality', path: '/technology/augmented-reality/', key: 'augmented-reality',
    title: 'Augmented Reality Research — INSTAR Lab Technology', heading: 'AUGMENTED REALITY', banner: 'img/banners/technology-augmented-reality.avif', primaryMedia: '../../img/pages/augmented-reality/showcase-1.avif',
    composition: 'technology-narrative', pageSignature: 'orientation → technical focus → applied context → open-data guardrail → invitation',
  },
  {
    family: 'technology', slug: 'computer-science', path: '/technology/computer-science/', key: 'computer-science',
    title: 'Computer Science Research — INSTAR Lab Technology', heading: 'COMPUTER SCIENCE', banner: 'img/banners/technology-computer-science.avif', primaryMedia: '../../img/pages/computer-science/card-1.avif',
    composition: 'technology-index', pageSignature: 'capability index → open-data grounding → partner context → invitation',
  },
  {
    family: 'technology', slug: 'data-science', path: '/technology/data-science/', key: 'data-science',
    title: 'Data Science Research — INSTAR Lab Technology', heading: 'DATA SCIENCE', banner: 'img/banners/technology-data-science.avif', primaryMedia: '../../img/pages/data-science/card-1.avif',
    composition: 'technology-index', pageSignature: 'capability index → open-data grounding → partner context → invitation',
  },
  {
    family: 'technology', slug: 'formal-methods', path: '/technology/formal-methods/', key: 'formal-methods',
    title: 'Formal Methods Research — INSTAR Lab Technology',
    description: 'INSTAR Lab researches formal verification, model checking, and mathematically rigorous approaches to software and hardware correctness for high-assurance and safety-critical systems.',
    heading: 'FORMAL METHODS', banner: 'img/banners/technology-formal-methods.avif', primaryMedia: '../../img/pages/formal-methods/hero.avif',
    composition: 'technology-narrative', pageSignature: 'orientation → technical focus → applied context → open-data guardrail → invitation',
  },
  {
    family: 'technology', slug: 'machine-intelligence', path: '/technology/machine-intelligence/', key: 'machine-intelligence',
    title: 'Machine Intelligence Research — INSTAR Lab Technology', heading: 'MACHINE INTELLIGENCE', banner: 'img/banners/technology-machine-intelligence.avif', primaryMedia: '../../img/pages/machine-intelligence/section-1.avif',
    composition: 'technology-narrative', pageSignature: 'orientation → technical focus → applied context → open-data guardrail → invitation',
  },
  {
    family: 'technology', slug: 'natural-language-processing', path: '/technology/natural-language-processing/', key: 'natural-language-processing',
    title: 'Natural Language Processing Research — INSTAR Lab Technology', heading: 'NATURAL LANGUAGE PROCESSING', banner: 'img/banners/technology-natural-language-processing.avif', primaryMedia: '../../img/projects/nlp-tech-language-understanding.avif',
    composition: 'technology-index', pageSignature: 'capability index → open-data grounding → partner context → invitation',
  },
  {
    family: 'technology', slug: 'quantum-computing', path: '/technology/quantum-computing/', key: 'quantum-computing',
    title: 'Quantum Computing Research — INSTAR Lab Technology', heading: 'QUANTUM COMPUTING', banner: 'img/banners/technology-quantum-computing.avif', primaryMedia: '../../img/pages/quantum-computing/hero.avif',
    composition: 'technology-narrative', pageSignature: 'orientation → technical focus → applied context → open-data guardrail → invitation',
  },
  {
    family: 'sciences', slug: 'agriculture', path: '/sciences/agriculture/', key: 'agriculture',
    title: 'Agriculture Research — INSTAR Lab Sciences', heading: 'AGRICULTURE', banner: 'img/banners/sciences-agriculture.avif', primaryMedia: '../../img/pages/agriculture/card-1.avif',
    composition: 'science-index', pageSignature: 'discipline index → open-data grounding → partner context → invitation',
  },
  {
    family: 'sciences', slug: 'anthropology', path: '/sciences/anthropology/', key: 'anthropology',
    title: 'Anthropology Research — INSTAR Lab Sciences', heading: 'ANTHROPOLOGY', banner: 'img/banners/sciences-anthropology.avif', primaryMedia: '../../img/pages/anthropology/hero.avif',
    composition: 'science-narrative', pageSignature: 'orientation → discipline focus → research evidence → open-data guardrail → invitation',
  },
  {
    family: 'sciences', slug: 'archaeology', path: '/sciences/archaeology/', key: 'archaeology',
    title: 'Archaeology Research — INSTAR Lab Sciences',
    description: 'INSTAR Lab applies geospatial analysis, remote sensing, and AI-assisted artifact classification to archaeological investigation and digital heritage preservation.',
    heading: 'ARCHAEOLOGY', banner: 'img/banners/sciences-archaeology.avif', primaryMedia: '../../img/pages/archaeology/card-1.avif',
    composition: 'science-index', pageSignature: 'discipline index → open-data grounding → partner context → invitation',
  },
  {
    family: 'sciences', slug: 'biology', path: '/sciences/biology/', key: 'biology',
    title: 'Biology Research — INSTAR Lab Sciences', heading: 'BIOLOGY', banner: 'img/banners/sciences-biology.avif', primaryMedia: '../../img/pages/biology/card-1.avif',
    composition: 'science-index', pageSignature: 'discipline index → open-data grounding → partner context → invitation',
  },
  {
    family: 'sciences', slug: 'chemistry', path: '/sciences/chemistry/', key: 'chemistry',
    title: 'Chemistry Research — INSTAR Lab Sciences', heading: 'CHEMISTRY', banner: 'img/banners/sciences-chemistry.avif', primaryMedia: '../../img/pages/chemistry/card-1.avif',
    composition: 'science-index', pageSignature: 'discipline index → open-data grounding → partner context → invitation',
  },
  {
    family: 'sciences', slug: 'cognitive-sciences', path: '/sciences/cognitive-sciences/', key: 'cognitive-sciences',
    title: 'Cognitive Sciences Research — INSTAR Lab',
    description: 'INSTAR Lab researches cognition, learning, and mental representation through computational modeling, neuroscience, and interdisciplinary approaches spanning psychology and AI.',
    heading: 'COGNITIVE SCIENCES', banner: 'img/banners/sciences-cognitive-sciences.avif', primaryMedia: '../../img/pages/cognitive-sciences/hero.avif',
    composition: 'science-narrative', pageSignature: 'orientation → discipline focus → research evidence → open-data guardrail → invitation',
  },
  {
    family: 'sciences', slug: 'economics', path: '/sciences/economics/', key: 'economics',
    title: 'Economics Research — INSTAR Lab Sciences',
    description: 'INSTAR Lab applies quantitative methods, computational economics, and data science to policy analysis, market behavior, and the economic dimensions of technology and science.',
    heading: 'ECONOMICS', banner: 'img/banners/sciences-economics.avif', primaryMedia: '../../img/pages/economics/card-1.avif',
    composition: 'science-index', pageSignature: 'discipline index → open-data grounding → partner context → invitation',
  },
  {
    family: 'sciences', slug: 'energy', path: '/sciences/energy/', key: 'energy',
    title: 'Energy Research — INSTAR Lab Sciences', heading: 'ENERGY', banner: 'img/banners/sciences-energy.avif', primaryMedia: '../../img/pages/energy/section-1.avif',
    composition: 'science-index', pageSignature: 'discipline index → open-data grounding → partner context → invitation',
  },
  {
    family: 'sciences', slug: 'genetics', path: '/sciences/genetics/', key: 'genetics',
    title: 'Genetics Research — INSTAR Lab Sciences', heading: 'GENETICS', banner: 'img/banners/sciences-genetics.avif', primaryMedia: '../../img/pages/genetics/hero.avif',
    composition: 'science-narrative', pageSignature: 'orientation → discipline focus → research evidence → open-data guardrail → invitation',
  },
  {
    family: 'sciences', slug: 'geology', path: '/sciences/geology/', key: 'geology',
    title: 'Geology Research — INSTAR Lab Sciences', heading: 'GEOLOGY', banner: 'img/banners/sciences-geology.avif', primaryMedia: '../../img/pages/geology/card-1.avif',
    composition: 'science-index', pageSignature: 'discipline index → open-data grounding → partner context → invitation',
  },
  {
    family: 'sciences', slug: 'kinesiology', path: '/sciences/kinesiology/', key: 'kinesiology',
    title: 'Kinesiology Research — INSTAR Lab Sciences', heading: 'KINESIOLOGY', banner: 'img/banners/sciences-kinesiology.avif', primaryMedia: '../../img/pages/kinesiology/card-1.avif',
    composition: 'science-index', pageSignature: 'discipline index → open-data grounding → partner context → invitation',
  },
  {
    family: 'sciences', slug: 'law', path: '/sciences/law/', key: 'law',
    title: 'Law & Legal Research — INSTAR Lab Sciences',
    description: 'INSTAR Lab researches the intersection of law, technology, and science — including AI governance, data regulation, intellectual property, and evidence-based legal analysis.',
    heading: 'LAW', banner: 'img/banners/sciences-law.avif', primaryMedia: '../../img/pages/law/hero.avif',
    composition: 'science-narrative', pageSignature: 'orientation → discipline focus → research evidence → open-data guardrail → invitation',
  },
  {
    family: 'sciences', slug: 'linguistics', path: '/sciences/linguistics/', key: 'linguistics',
    title: 'Linguistics Research — INSTAR Lab Sciences', heading: 'LINGUISTICS', banner: 'img/banners/sciences-linguistics.avif', primaryMedia: '../../img/pages/linguistics/card-1.avif',
    composition: 'science-index', pageSignature: 'discipline index → open-data grounding → partner context → invitation',
  },
  {
    family: 'sciences', slug: 'materials-science', path: '/sciences/materials-science/', key: 'materials-science',
    title: 'Materials Science Research — INSTAR Lab', heading: 'MATERIALS SCIENCE', banner: 'img/banners/sciences-materials-science.avif', primaryMedia: '../../img/pages/materials-science/hero.avif',
    composition: 'science-narrative', pageSignature: 'orientation → discipline focus → research evidence → open-data guardrail → invitation',
  },
  {
    family: 'sciences', slug: 'medicine', path: '/sciences/medicine/', key: 'medicine',
    title: 'Medicine & Health Research — INSTAR Lab Sciences', heading: 'MEDICINE', banner: 'img/banners/sciences-medicine.avif', primaryMedia: '../../img/pages/medicine/section-1.avif',
    composition: 'science-narrative', pageSignature: 'orientation → discipline focus → research evidence → open-data guardrail → invitation',
  },
  {
    family: 'sciences', slug: 'neuroscience', path: '/sciences/neuroscience/', key: 'neuroscience',
    title: 'Neuroscience Research — INSTAR Lab Sciences', heading: 'NEUROSCIENCE', banner: 'img/banners/sciences-neuroscience.avif', primaryMedia: '../../img/pages/neuroscience/card-1.avif',
    composition: 'science-index', pageSignature: 'discipline index → open-data grounding → partner context → invitation',
  },
  {
    family: 'sciences', slug: 'ocean-science', path: '/sciences/ocean-science/', key: 'ocean-science',
    title: 'Ocean Science Research — INSTAR Lab Sciences', heading: 'OCEAN SCIENCE', banner: 'img/banners/sciences-ocean-science.avif', primaryMedia: '../../img/pages/ocean-science/hero.avif',
    composition: 'science-narrative', pageSignature: 'orientation → discipline focus → research evidence → open-data guardrail → invitation',
  },
  {
    family: 'sciences', slug: 'outer-space', path: '/sciences/outer-space/', key: 'outer-space',
    title: 'Outer Space Research — INSTAR Lab Sciences', heading: 'OUTER SPACE', banner: 'img/banners/sciences-outer-space.avif', primaryMedia: '../../img/pages/outer-space/section-1.avif',
    composition: 'science-narrative', pageSignature: 'orientation → discipline focus → research evidence → open-data guardrail → invitation',
  },
  {
    family: 'sciences', slug: 'physics', path: '/sciences/physics/', key: 'physics',
    title: 'Physics Research — INSTAR Lab Sciences', heading: 'PHYSICS', banner: 'img/banners/sciences-physics.avif', primaryMedia: '../../img/pages/physics/section-1.avif',
    composition: 'science-narrative', pageSignature: 'orientation → discipline focus → research evidence → open-data guardrail → invitation',
  },
  {
    family: 'sciences', slug: 'physiology', path: '/sciences/physiology/', key: 'physiology',
    title: 'Physiology Research — INSTAR Lab Sciences', heading: 'PHYSIOLOGY', banner: 'img/banners/sciences-physiology.avif', primaryMedia: '../../img/pages/physiology/card-1.avif',
    composition: 'science-index', pageSignature: 'discipline index → open-data grounding → partner context → invitation',
  },
  {
    family: 'sciences', slug: 'psychology', path: '/sciences/psychology/', key: 'psychology',
    title: 'Psychology Research — INSTAR Lab Sciences', heading: 'PSYCHOLOGY', banner: 'img/banners/sciences-psychology.avif', primaryMedia: '../../img/pages/psychology/section-1.avif',
    composition: 'science-narrative', pageSignature: 'orientation → discipline focus → research evidence → open-data guardrail → invitation',
  },
  {
    family: 'sciences', slug: 'sociology', path: '/sciences/sociology/', key: 'sociology',
    title: 'Sociology Research — INSTAR Lab Sciences', heading: 'SOCIOLOGY', banner: 'img/banners/sciences-sociology.avif', primaryMedia: '../../img/pages/sociology/card-1.avif',
    composition: 'science-index', pageSignature: 'discipline index → open-data grounding → partner context → invitation',
  },
] as const satisfies readonly InstarResearchTechnologySciencesRoute[];

export function getInstarResearchTechnologySciencesRoutes(
  family: InstarResearchTechnologySciencesFamily,
): readonly InstarResearchTechnologySciencesRoute[] {
  return instarResearchTechnologySciencesRoutes.filter((route) => route.family === family);
}

export function getInstarResearchTechnologySciencesRoute(
  family: InstarResearchTechnologySciencesFamily,
  slug: string,
): InstarResearchTechnologySciencesRoute {
  const route = instarResearchTechnologySciencesRoutes.find(
    (candidate) => candidate.family === family && candidate.slug === slug,
  );

  if (!route) {
    throw new Error(`Unknown ${family} route: ${slug}`);
  }

  return route;
}

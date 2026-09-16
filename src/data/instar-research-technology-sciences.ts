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
    description: 'Review the INSTAR Lab research portfolio across AI, quantum science, high-performance computing, health, energy, space, and the sciences. This index describes research areas; individual program status, outputs, schedules, and partner assignments are not listed here.',
    heading: 'CURRENT PROGRAMS', banner: 'img/banners/research-current-programs.avif', primaryMedia: '../../img/pages/current-programs/card-1-current.avif',
    composition: 'evidence-index', pageSignature: 'portfolio index → research areas → evidence path → action',
  },
  {
    family: 'research', slug: 'facilities', path: '/research/facilities/', key: 'facilities',
    title: 'Research Facilities — INSTAR Lab', description: 'Review the laboratory, compute, sensing, and collaboration infrastructure that supports INSTAR Lab research programs and sponsored work.', heading: 'FACILITIES', banner: 'img/banners/research-facilities.avif', primaryMedia: '../../img/pages/facilities/card-1.avif',
    composition: 'evidence-index', pageSignature: 'featured index → evidence rail → partner context → action',
  },
  {
    family: 'research', slug: 'funding', path: '/research/funding/', key: 'funding',
    title: 'Federal Research & Sponsored Programs — INSTAR Lab',
    description: 'Review how INSTAR Lab approaches federal research funding, sponsored programs, and STTR partnerships across NSF, NASA, DOE, USDA, and other mission-driven organizations.',
    heading: 'FUNDING', banner: 'img/banners/research-funding.avif', primaryMedia: null,
    composition: 'funding-pathway', pageSignature: 'question canvas → funding routes → support sequence → action',
  },
  {
    family: 'research', slug: 'innovation', path: '/research/innovation/', key: 'innovation',
    title: 'Research Innovation — INSTAR Lab',
    description: 'INSTAR Lab develops research at the frontier of AI, quantum science, high-performance computing, health, energy, and space, with a focus on methods and outputs that can move from scientific question to applied program.',
    heading: 'INNOVATION', banner: 'img/banners/research-innovation.avif', primaryMedia: '../../img/pages/innovation/section-1.avif',
    composition: 'research-narrative', pageSignature: 'orientation → translational evidence → contrast → themes → partnership',
  },
  {
    family: 'research', slug: 'open-data', path: '/research/open-data/', key: 'open-data',
    title: 'Open Data & Public Datasets — INSTAR Lab',
    description: 'INSTAR Lab uses open and well-documented datasets from federal portals, science agencies, and research repositories to support reproducible analysis, AI evaluation, and accountable scientific decisions.',
    heading: 'OPEN DATA & PUBLIC DATASETS', banner: 'img/banners/research-open-data.avif', primaryMedia: '../../img/slider/geospatial.avif',
    composition: 'data-atlas', pageSignature: 'orientation → source constellation → data practice → fellowship invitation',
  },
  {
    family: 'research', slug: 'opportunities', path: '/research/opportunities/', key: 'opportunities',
    title: 'Research Opportunities — INSTAR Lab',
    description: 'Review engagement opportunities at INSTAR Lab, including collaborative programs, STTR partnerships, co-investigation, fellowship, and sponsored research pathways across the Consortium.',
    heading: 'OPPORTUNITIES', banner: 'img/banners/research-opportunities.avif', primaryMedia: '../../img/pages/opportunities/card-1.avif',
    composition: 'opportunity-index', pageSignature: 'orientation → opportunity index → public-data proof → fellowship invitation',
  },
  {
    family: 'research', slug: 'our-process', path: '/research/our-process/', key: 'our-process',
    title: 'Our Research Process — INSTAR Lab', description: 'Review how INSTAR Lab frames research questions, selects methods, examines evidence, and documents limitations before sharing a result.', heading: 'OUR PROCESS', banner: 'img/banners/research-our-process.avif', primaryMedia: '../../img/pages/our-process/hero.avif',
    composition: 'research-method', pageSignature: 'research method → documented sequence → evidence path → engagement',
  },
  {
    family: 'technology', slug: 'augmented-reality', path: '/technology/augmented-reality/', key: 'augmented-reality',
    title: 'Augmented Reality Research — INSTAR Lab Technology', heading: 'AUGMENTED REALITY', banner: 'img/banners/technology-augmented-reality.avif', primaryMedia: '../../img/pages/augmented-reality/showcase-1.avif',
    composition: 'technology-narrative', pageSignature: 'orientation → technical focus → applied context → open-data guardrail → invitation',
  },
  {
    family: 'technology', slug: 'computer-science', path: '/technology/computer-science/', key: 'computer-science',
    title: 'Computer Science Research — INSTAR Lab Technology', description: 'Review the software, systems, secure-compute, and high-performance architectures that enable INSTAR Lab AI and scientific research programs.', heading: 'COMPUTER SCIENCE', banner: 'img/banners/technology-computer-science.avif', primaryMedia: '../../img/pages/computer-science/card-1.avif',
    composition: 'technology-index', pageSignature: 'capability index → open-data grounding → partner context → invitation',
  },
  {
    family: 'technology', slug: 'data-science', path: '/technology/data-science/', key: 'data-science',
    title: 'Data Science Research — INSTAR Lab Technology', description: 'Apply statistical learning, advanced AI, data engineering, and reproducible analytics to scientific questions across INSTAR Lab research domains.', heading: 'DATA SCIENCE', banner: 'img/banners/technology-data-science.avif', primaryMedia: '../../img/pages/data-science/card-1.avif',
    composition: 'technology-index', pageSignature: 'capability index → open-data grounding → partner context → invitation',
  },
  {
    family: 'technology', slug: 'formal-methods', path: '/technology/formal-methods/', key: 'formal-methods',
    title: 'Formal Methods Research — INSTAR Lab Technology',
    description: 'INSTAR Lab researches formal verification, model checking, and mathematically rigorous approaches to software and hardware correctness, including assurance for AI-enabled and safety-critical systems.',
    heading: 'FORMAL METHODS', banner: 'img/banners/technology-formal-methods.avif', primaryMedia: '../../img/pages/formal-methods/hero.avif',
    composition: 'technology-narrative', pageSignature: 'orientation → technical focus → applied context → open-data guardrail → invitation',
  },
  {
    family: 'technology', slug: 'machine-intelligence', path: '/technology/machine-intelligence/', key: 'machine-intelligence',
    title: 'Machine Intelligence Research — INSTAR Lab Technology', description: 'Research advanced AI systems for reasoning, learning, perception, autonomy, and scientific discovery, with evaluation and safety treated as core technical requirements.', heading: 'MACHINE INTELLIGENCE', banner: 'img/banners/technology-machine-intelligence.avif', primaryMedia: '../../img/pages/machine-intelligence/section-1.avif',
    composition: 'technology-narrative', pageSignature: 'orientation → technical focus → applied context → open-data guardrail → invitation',
  },
  {
    family: 'technology', slug: 'natural-language-processing', path: '/technology/natural-language-processing/', key: 'natural-language-processing',
    title: 'Natural Language Processing Research — INSTAR Lab Technology', description: 'Develop AI methods that turn scientific, technical, legal, and operational language into structured evidence, searchable knowledge, and decision support.', heading: 'NATURAL LANGUAGE PROCESSING', banner: 'img/banners/technology-natural-language-processing.avif', primaryMedia: '../../img/projects/nlp-tech-language-understanding.avif',
    composition: 'technology-index', pageSignature: 'capability index → open-data grounding → partner context → invitation',
  },
  {
    family: 'technology', slug: 'quantum-computing', path: '/technology/quantum-computing/', key: 'quantum-computing',
    title: 'Quantum Computing Research — INSTAR Lab Technology', description: 'Investigate quantum information, algorithms, error correction, and quantum-classical architectures alongside advanced AI and high-performance computing.', heading: 'QUANTUM COMPUTING', banner: 'img/banners/technology-quantum-computing.avif', primaryMedia: '../../img/pages/quantum-computing/hero.avif',
    composition: 'technology-narrative', pageSignature: 'orientation → technical focus → applied context → open-data guardrail → invitation',
  },
  {
    family: 'sciences', slug: 'agriculture', path: '/sciences/agriculture/', key: 'agriculture',
    title: 'Agriculture Research — INSTAR Lab Sciences', description: 'Apply advanced AI, remote sensing, soil science, and quantitative modeling to agricultural questions, with field evidence and data stewardship kept in view.', heading: 'AGRICULTURE', banner: 'img/banners/sciences-agriculture.avif', primaryMedia: '../../img/pages/agriculture/card-1.avif',
    composition: 'science-index', pageSignature: 'discipline index → open-data grounding → partner context → invitation',
  },
  {
    family: 'sciences', slug: 'anthropology', path: '/sciences/anthropology/', key: 'anthropology',
    title: 'Anthropology Research — INSTAR Lab Sciences', description: 'Use computational methods and advanced AI with qualitative and historical evidence to study human systems, culture, and social change.', heading: 'ANTHROPOLOGY', banner: 'img/banners/sciences-anthropology.avif', primaryMedia: '../../img/pages/anthropology/hero.avif',
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
    title: 'Biology Research — INSTAR Lab Sciences', description: 'Combine advanced AI, biological data, imaging, and experimental reasoning to investigate living systems and the conditions that shape them.', heading: 'BIOLOGY', banner: 'img/banners/sciences-biology.avif', primaryMedia: '../../img/pages/biology/card-1.avif',
    composition: 'science-index', pageSignature: 'discipline index → open-data grounding → partner context → invitation',
  },
  {
    family: 'sciences', slug: 'chemistry', path: '/sciences/chemistry/', key: 'chemistry',
    title: 'Chemistry Research — INSTAR Lab Sciences', description: 'Use AI-assisted modeling, simulation, and materials analysis to examine chemical systems, reactions, and candidates for energy and health applications.', heading: 'CHEMISTRY', banner: 'img/banners/sciences-chemistry.avif', primaryMedia: '../../img/pages/chemistry/card-1.avif',
    composition: 'science-index', pageSignature: 'discipline index → open-data grounding → partner context → invitation',
  },
  {
    family: 'sciences', slug: 'cognitive-sciences', path: '/sciences/cognitive-sciences/', key: 'cognitive-sciences',
    title: 'Cognitive Sciences Research — INSTAR Lab Sciences',
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
    title: 'Energy Research — INSTAR Lab Sciences', description: 'Apply advanced AI, materials science, quantum methods, and systems modeling to energy generation, storage, conversion, and grid questions.', heading: 'ENERGY', banner: 'img/banners/sciences-energy.avif', primaryMedia: '../../img/pages/energy/section-1.avif',
    composition: 'science-index', pageSignature: 'discipline index → open-data grounding → partner context → invitation',
  },
  {
    family: 'sciences', slug: 'genetics', path: '/sciences/genetics/', key: 'genetics',
    title: 'Genetics Research — INSTAR Lab Sciences', description: 'Use advanced AI and computational biology to analyze genetic variation, biological systems, and the limits of inference from complex datasets.', heading: 'GENETICS', banner: 'img/banners/sciences-genetics.avif', primaryMedia: '../../img/pages/genetics/hero.avif',
    composition: 'science-narrative', pageSignature: 'orientation → discipline focus → research evidence → open-data guardrail → invitation',
  },
  {
    family: 'sciences', slug: 'geology', path: '/sciences/geology/', key: 'geology',
    title: 'Geology Research — INSTAR Lab Sciences', description: 'Combine remote sensing, geospatial AI, simulation, and field data to examine earth systems, resources, and change across time and scale.', heading: 'GEOLOGY', banner: 'img/banners/sciences-geology.avif', primaryMedia: '../../img/pages/geology/card-1.avif',
    composition: 'science-index', pageSignature: 'discipline index → open-data grounding → partner context → invitation',
  },
  {
    family: 'sciences', slug: 'kinesiology', path: '/sciences/kinesiology/', key: 'kinesiology',
    title: 'Kinesiology Research — INSTAR Lab Sciences', description: 'Use multimodal sensing, biomechanical modeling, and AI analysis to study movement, performance, rehabilitation, and human health.', heading: 'KINESIOLOGY', banner: 'img/banners/sciences-kinesiology.avif', primaryMedia: '../../img/pages/kinesiology/card-1.avif',
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
    title: 'Linguistics Research — INSTAR Lab Sciences', description: 'Apply natural-language processing, computational linguistics, and advanced AI to language structure, meaning, communication, and knowledge extraction.', heading: 'LINGUISTICS', banner: 'img/banners/sciences-linguistics.avif', primaryMedia: '../../img/pages/linguistics/card-1.avif',
    composition: 'science-index', pageSignature: 'discipline index → open-data grounding → partner context → invitation',
  },
  {
    family: 'sciences', slug: 'materials-science', path: '/sciences/materials-science/', key: 'materials-science',
    title: 'Materials Science Research — INSTAR Lab Sciences', description: 'Use AI-assisted discovery, quantum modeling, simulation, and characterization to investigate materials for energy, computing, and resilient infrastructure.', heading: 'MATERIALS SCIENCE', banner: 'img/banners/sciences-materials-science.avif', primaryMedia: '../../img/pages/materials-science/hero.avif',
    composition: 'science-narrative', pageSignature: 'orientation → discipline focus → research evidence → open-data guardrail → invitation',
  },
  {
    family: 'sciences', slug: 'medicine', path: '/sciences/medicine/', key: 'medicine',
    title: 'Medicine & Health Research — INSTAR Lab Sciences', description: 'Apply advanced AI, biomedical data, and rigorous evaluation to questions in health, medicine, diagnostics, and clinical decision support.', heading: 'MEDICINE', banner: 'img/banners/sciences-medicine.avif', primaryMedia: '../../img/pages/medicine/section-1.avif',
    composition: 'science-narrative', pageSignature: 'orientation → discipline focus → research evidence → open-data guardrail → invitation',
  },
  {
    family: 'sciences', slug: 'neuroscience', path: '/sciences/neuroscience/', key: 'neuroscience',
    title: 'Neuroscience Research — INSTAR Lab Sciences', description: 'Combine neuroscience, computational modeling, and advanced AI to study brain systems, cognition, neural signals, and the limits of interpretation.', heading: 'NEUROSCIENCE', banner: 'img/banners/sciences-neuroscience.avif', primaryMedia: '../../img/pages/neuroscience/card-1.avif',
    composition: 'science-index', pageSignature: 'discipline index → open-data grounding → partner context → invitation',
  },
  {
    family: 'sciences', slug: 'ocean-science', path: '/sciences/ocean-science/', key: 'ocean-science',
    title: 'Ocean Science Research — INSTAR Lab Sciences', description: 'Use remote sensing, geospatial AI, environmental modeling, and field data to study ocean systems, climate signals, and marine change.', heading: 'OCEAN SCIENCE', banner: 'img/banners/sciences-ocean-science.avif', primaryMedia: '../../img/pages/ocean-science/hero.avif',
    composition: 'science-narrative', pageSignature: 'orientation → discipline focus → research evidence → open-data guardrail → invitation',
  },
  {
    family: 'sciences', slug: 'outer-space', path: '/sciences/outer-space/', key: 'outer-space',
    title: 'Outer Space Research — INSTAR Lab Sciences', description: 'Apply advanced AI, orbital systems, autonomous robotics, and multi-spectrum sensing to space science and space-domain research.', heading: 'OUTER SPACE', banner: 'img/banners/sciences-outer-space.avif', primaryMedia: '../../img/pages/outer-space/section-1.avif',
    composition: 'science-narrative', pageSignature: 'orientation → discipline focus → research evidence → open-data guardrail → invitation',
  },
  {
    family: 'sciences', slug: 'physics', path: '/sciences/physics/', key: 'physics',
    title: 'Physics Research — INSTAR Lab Sciences', description: 'Use quantum research, simulation, advanced AI, and high-performance computing to investigate physical systems from fundamental theory to applied measurement.', heading: 'PHYSICS', banner: 'img/banners/sciences-physics.avif', primaryMedia: '../../img/pages/physics/section-1.avif',
    composition: 'science-narrative', pageSignature: 'orientation → discipline focus → research evidence → open-data guardrail → invitation',
  },
  {
    family: 'sciences', slug: 'physiology', path: '/sciences/physiology/', key: 'physiology',
    title: 'Physiology Research — INSTAR Lab Sciences', description: 'Apply AI, biosignal analysis, and quantitative modeling to human physiology, health conditions, and the systems that connect them.', heading: 'PHYSIOLOGY', banner: 'img/banners/sciences-physiology.avif', primaryMedia: '../../img/pages/physiology/card-1.avif',
    composition: 'science-index', pageSignature: 'discipline index → open-data grounding → partner context → invitation',
  },
  {
    family: 'sciences', slug: 'psychology', path: '/sciences/psychology/', key: 'psychology',
    title: 'Psychology Research — INSTAR Lab Sciences', description: 'Combine behavioral science, cognitive modeling, and advanced AI to investigate learning, decision-making, perception, and human-machine interaction.', heading: 'PSYCHOLOGY', banner: 'img/banners/sciences-psychology.avif', primaryMedia: '../../img/pages/psychology/section-1.avif',
    composition: 'science-narrative', pageSignature: 'orientation → discipline focus → research evidence → open-data guardrail → invitation',
  },
  {
    family: 'sciences', slug: 'sociology', path: '/sciences/sociology/', key: 'sociology',
    title: 'Sociology Research — INSTAR Lab Sciences', description: 'Use computational social science, language analysis, and advanced AI to examine institutions, networks, behavior, and the effects of emerging technology.', heading: 'SOCIOLOGY', banner: 'img/banners/sciences-sociology.avif', primaryMedia: '../../img/pages/sociology/card-1.avif',
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

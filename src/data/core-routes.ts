export type CoreRouteMeta = {
  path: string;
  sourceFile: string;
  title: string;
  description: string;
  canonical: string;
  robots: string;
  pageSignature: string;
};

export const coreRoutes = {
  home: {
    path: '/',
    sourceFile: 'index.html',
    title: 'INSTAR Lab — Independent Nonprofit Research Institute',
    description:
      'INSTAR Lab is a 501(c)(3) nonprofit advancing applied research in AI, quantum science, HPC, health, energy, and space through interdisciplinary collaboration.',
    canonical: 'https://instarlab.org/',
    robots: 'index, follow',
    pageSignature: 'orientation → field of inquiry → research pathways → invitation',
  },
  about: {
    path: '/about.html',
    sourceFile: 'about.html',
    title: 'INSTAR Lab || About Us',
    description:
      'About INSTAR Lab — an independent 501(c)(3) nonprofit research institute advancing science through AI, quantum science, HPC, health, energy, and space research.',
    canonical: 'https://instarlab.org/about.html',
    robots: 'index, follow',
    pageSignature: 'orientation → institutional story → ways of working → invitation',
  },
  mission: {
    path: '/mission.html',
    sourceFile: 'mission.html',
    title: 'Our Mission — INSTAR Lab',
    description:
      'INSTAR Lab exists to expand human knowledge through rigorous, evidence-driven research and translate discoveries into public-benefit applications across science and technology.',
    canonical: 'https://instarlab.org/mission.html',
    robots: 'index, follow',
    pageSignature: 'thesis → operating principles → public benefit → participation',
  },
  contact: {
    path: '/contact-us.html',
    sourceFile: 'contact-us.html',
    title: 'INSTAR Lab || Contact Us',
    description:
      'Contact INSTAR Lab — reach us for research collaboration, partnership proposals, media requests, federal and grant-related questions, or donor inquiries.',
    canonical: 'https://instarlab.org/contact-us.html',
    robots: 'index, follow',
    pageSignature: 'orientation → contact paths → intake form → expectations',
  },
  privacy: {
    path: '/privacy.html',
    sourceFile: 'privacy.html',
    title: 'Privacy Policy — INSTAR Lab',
    description:
      "INSTAR Lab's privacy policy explains how we collect, use, and protect information on this website and through our research programs.",
    canonical: 'https://instarlab.org/privacy.html',
    robots: 'index, follow',
    pageSignature: 'plain-language summary → policy sections → user choices → contact',
  },
  terms: {
    path: '/terms.html',
    sourceFile: 'terms.html',
    title: 'Terms of Use — INSTAR Lab',
    description:
      'Terms governing use of the INSTAR Lab website, including intellectual property, disclaimers, and acceptable use of our research content.',
    canonical: 'https://instarlab.org/terms.html',
    robots: 'index, follow',
    pageSignature: 'scope → responsibilities → rights and disclaimers → contact',
  },
  accessibility: {
    path: '/accessibility.html',
    sourceFile: 'accessibility.html',
    title: 'Accessibility Statement — INSTAR Lab',
    description:
      'INSTAR Lab is committed to making its website accessible to all users. Read our accessibility statement and report issues.',
    canonical: 'https://instarlab.org/accessibility.html',
    robots: 'index, follow',
    pageSignature: 'commitment → current practices → feedback path → contact',
  },
  notFound: {
    path: '/404.html',
    sourceFile: '404.html',
    title: 'Page Not Found — INSTAR Lab',
    description:
      'The page you requested could not be found. Return to the INSTAR Lab homepage to explore our research programs, fellowship, and partnership opportunities.',
    canonical: 'https://instarlab.org/404.html',
    robots: 'noindex, follow',
    pageSignature: 'orientation → recovery path → research destinations',
  },
} satisfies Record<string, CoreRouteMeta>;

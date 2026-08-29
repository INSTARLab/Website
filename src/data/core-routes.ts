export type CoreRouteMeta = {
  path: string;
  key: string;
  title: string;
  description: string;
  canonical: string;
  robots: string;
  pageSignature: string;
};

export const coreRoutes = {
  home: {
    path: '/',
    key: 'home',
    title: 'INSTAR Lab — Research Institute',
    description:
      'INSTAR Lab is a 501(c)(3) nonprofit research institute conducting applied research in artificial intelligence, quantum science, high-performance computing, health, energy, space, and the sciences for federal and institutional research partners.',
    canonical: 'https://instarlab.org/',
    robots: 'index, follow',
    pageSignature: 'orientation → research portfolio → technical capabilities → invitation',
  },
  about: {
    path: '/about/',
    key: 'about',
    title: 'About INSTAR Lab — Nonprofit Research Institute',
    description:
      'About INSTAR Lab, a 501(c)(3) nonprofit research institute applying advanced AI, quantum research, high-performance computing, and domain science to ambitious research programs.',
    canonical: 'https://instarlab.org/about/',
    robots: 'index, follow',
    pageSignature: 'orientation → institutional story → ways of working → invitation',
  },
  mission: {
    path: '/mission/',
    key: 'mission',
    title: 'Our Mission — INSTAR Lab',
    description:
      'INSTAR Lab advances human knowledge through rigorous research in AI, quantum science, and the full range of scientific domains, with methods and outputs that sponsors and collaborators can evaluate.',
    canonical: 'https://instarlab.org/mission/',
    robots: 'index, follow',
    pageSignature: 'thesis → operating principles → scientific outputs → participation',
  },
  contact: {
    path: '/contact-us/',
    key: 'contact-us',
    title: 'Contact INSTAR Lab — Federal Research, Contracts & Partnerships',
    description:
      'Contact INSTAR Lab about federal research, grants, contracts, sponsored programs, technical partnerships, or a scientific question in AI, quantum, computing, health, energy, space, or another field.',
    canonical: 'https://instarlab.org/contact-us/',
    robots: 'index, follow',
    pageSignature: 'orientation → contact paths → intake form → expectations',
  },
  privacy: {
    path: '/privacy/',
    key: 'privacy',
    title: 'Privacy Policy — INSTAR Lab',
    description:
      "INSTAR Lab's privacy policy explains how we collect, use, and protect information on this website and through our research programs.",
    canonical: 'https://instarlab.org/privacy/',
    robots: 'index, follow',
    pageSignature: 'plain-language summary → policy sections → user choices → contact',
  },
  terms: {
    path: '/terms/',
    key: 'terms',
    title: 'Terms of Use — INSTAR Lab',
    description:
      'Terms governing use of the INSTAR Lab website, including intellectual property, disclaimers, and acceptable use of our research content.',
    canonical: 'https://instarlab.org/terms/',
    robots: 'index, follow',
    pageSignature: 'scope → responsibilities → rights and disclaimers → contact',
  },
  accessibility: {
    path: '/accessibility/',
    key: 'accessibility',
    title: 'Accessibility Statement — INSTAR Lab',
    description:
      'INSTAR Lab is committed to making its website accessible to all users. Read our accessibility statement and report issues.',
    canonical: 'https://instarlab.org/accessibility/',
    robots: 'index, follow',
    pageSignature: 'commitment → current practices → feedback path → contact',
  },
  notFound: {
    // Astro emits the special not-found entry point as 404.html for static
    // hosts, including GitHub Pages and GitLab Pages.
    path: '/404.html',
    key: '404',
    title: 'Page Not Found — INSTAR Lab',
    description:
      'The page you requested could not be found. Return to the INSTAR Lab homepage to explore our research programs, fellowship, and partnership opportunities.',
    canonical: 'https://instarlab.org/404.html',
    robots: 'noindex, follow',
    pageSignature: 'orientation → recovery path → research destinations',
  },
} satisfies Record<string, CoreRouteMeta>;

export interface NavigationItem {
  readonly label: string;
  readonly href: string;
}

export interface NavigationSection {
  readonly label: string;
  readonly items: readonly NavigationItem[];
}

export interface NavigationGroup {
  readonly label: string;
  readonly items?: readonly NavigationItem[];
  readonly sections?: readonly NavigationSection[];
}

export type PrimaryNavigationEntry = NavigationItem | NavigationGroup;

export const utilityNavigation = [
  { label: 'Email: info@instarlab.org', href: 'mailto:info@instarlab.org' },
  { label: 'Phone: 929-229-2918', href: 'tel:9292292918' },
  { label: 'Research', href: '/research/current-programs/' },
] as const satisfies readonly NavigationItem[];

export const primaryNavigation = [
  {
    label: 'About',
    items: [
      { label: 'Mission', href: '/mission.html' },
      { label: 'About Us', href: '/community/about-us/' },
      { label: 'Leadership', href: '/community/leadership/' },
      { label: 'INSTAR Consortium', href: '/research/consortium/' },
      { label: 'Facilities', href: '/research/facilities/' },
    ],
  },
  {
    label: 'Research',
    items: [
      { label: 'Innovation', href: '/research/innovation/' },
      { label: 'Our Process', href: '/research/our-process/' },
      { label: 'Current Programs', href: '/research/current-programs/' },
      { label: 'Funding', href: '/research/funding/' },
      { label: 'Open Data', href: '/research/open-data/' },
      { label: 'Opportunities', href: '/research/opportunities/' },
    ],
  },
  {
    label: 'Sciences',
    sections: [
      {
        label: 'Earth & Space',
        items: [
          { label: 'Agriculture', href: '/sciences/agriculture/' },
          { label: 'Geology', href: '/sciences/geology/' },
          { label: 'Ocean Science', href: '/sciences/ocean-science/' },
          { label: 'Outer Space', href: '/sciences/outer-space/' },
        ],
      },
      {
        label: 'Social Sciences',
        items: [
          { label: 'Anthropology', href: '/sciences/anthropology/' },
          { label: 'Archaeology', href: '/sciences/archaeology/' },
          { label: 'Economics', href: '/sciences/economics/' },
          { label: 'Law', href: '/sciences/law/' },
          { label: 'Linguistics', href: '/sciences/linguistics/' },
          { label: 'Psychology', href: '/sciences/psychology/' },
          { label: 'Sociology', href: '/sciences/sociology/' },
        ],
      },
      {
        label: 'Life Sciences',
        items: [
          { label: 'Biology', href: '/sciences/biology/' },
          { label: 'Genetics', href: '/sciences/genetics/' },
          { label: 'Medicine', href: '/sciences/medicine/' },
          { label: 'Cognitive Sciences', href: '/sciences/cognitive-sciences/' },
          { label: 'Neuroscience', href: '/sciences/neuroscience/' },
          { label: 'Physiology', href: '/sciences/physiology/' },
          { label: 'Kinesiology', href: '/sciences/kinesiology/' },
        ],
      },
      {
        label: 'Physical Sciences',
        items: [
          { label: 'Chemistry', href: '/sciences/chemistry/' },
          { label: 'Physics', href: '/sciences/physics/' },
          { label: 'Materials Science', href: '/sciences/materials-science/' },
          { label: 'Energy', href: '/sciences/energy/' },
        ],
      },
    ],
  },
  {
    label: 'Technology',
    items: [
      { label: 'Formal Methods', href: '/technology/formal-methods/' },
      { label: 'Data Science', href: '/technology/data-science/' },
      { label: 'Computer Science', href: '/technology/computer-science/' },
      { label: 'Machine Intelligence', href: '/technology/machine-intelligence/' },
      { label: 'Natural Language Processing', href: '/technology/natural-language-processing/' },
      { label: 'Augmented Reality', href: '/technology/augmented-reality/' },
      { label: 'Quantum Computing', href: '/technology/quantum-computing/' },
    ],
  },
  {
    label: 'Tech Transfer',
    items: [
      { label: 'STTR Programs', href: '/tech-transfer/sttr-programs/' },
      { label: 'Enterprise R&D', href: '/tech-transfer/enterprise-rd/' },
      { label: 'Portfolio', href: '/tech-transfer/portfolio/' },
      { label: 'Workshops & Events', href: '/tech-transfer/workshops-events/' },
    ],
  },
  {
    label: 'Community',
    items: [
      { label: 'Fellowship', href: '/fellowship/' },
      { label: 'Collaborate', href: '/community/work-with-us/' },
      { label: 'Careers', href: '/community/careers/' },
      { label: 'Contact', href: '/community/contact/' },
    ],
  },
  { label: 'News', href: '/news/' },
] as const satisfies readonly PrimaryNavigationEntry[];

export const researchFooterLinks = [
  { label: 'AI & ML', href: '/technology/machine-intelligence/' },
  { label: 'Quantum Science', href: '/technology/quantum-computing/' },
  { label: 'Data Analytics', href: '/technology/data-science/' },
  { label: 'Health Research', href: '/sciences/medicine/' },
  { label: 'Energy', href: '/sciences/energy/' },
  { label: 'HPC Systems', href: '/technology/computer-science/' },
] as const satisfies readonly NavigationItem[];

export const quickFooterLinks = [
  { label: 'About Us', href: '/community/about-us/' },
  { label: 'Fellowship', href: '/fellowship/' },
  { label: 'Careers', href: '/community/careers/' },
  { label: 'Terms of use', href: '/terms.html' },
  { label: 'Accessibility', href: '/accessibility.html' },
  { label: 'Privacy policy', href: '/privacy.html' },
] as const satisfies readonly NavigationItem[];

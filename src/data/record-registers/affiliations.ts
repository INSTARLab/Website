/**
 * The affiliation register.
 *
 * The public site presents an "INSTAR Consortium" of seven named partner
 * organizations, with their marks, on the consortium route and on the homepage.
 * This register does not dispute any of that and does not remove a name or a
 * logo from either page — that is public-facing branding and it is the owner's
 * call, not this register's. What it does is carry each affiliation next to
 * what actually establishes it.
 *
 * The honest result is uncomfortable and that is the point. One affiliation is
 * owner-confirmed. Six are published by the site with no partner-provided
 * source record, agreement, or confirmation attached, and the count of seven
 * has no source at all. Every partner mark's provenance record in
 * `src/data/media/public-media-policy.json` is `unverified`, so the marks
 * themselves are a separate, weaker question from the relationships: a mark can
 * be owner-supplied and still carry no recorded licence, and this register
 * keeps the two apart rather than letting one vouch for the other.
 *
 * A reader who wants a clean table is not going to get one here. A row that
 * says `unverified` is the correct output; a row that says nothing is not.
 */

import type { RegisterStatus } from './types';

export const affiliationRegisterRetrievedAt = '2026-09-14' as const;

/**
 * The consortium claim as the site makes it, with the count that has no source.
 *
 * `seven` is the part that matters. The register can count the organizations
 * the site names — that is repository-verified — but it cannot turn the site's
 * own count into a sourced fact, and it cannot establish that the consortium is
 * an entity that could have members in the first place.
 */
export interface ConsortiumClaim {
  readonly statement: string;
  readonly where: string;
  readonly status: RegisterStatus;
  readonly countEstablished: string;
  readonly limits: string;
}

export const recordConsortiumClaim: ConsortiumClaim = {
  statement:
    'The INSTAR Consortium unites seven specialized partner organizations to advance applied research across AI, quantum science, health, energy, and the full sciences through shared methodology.',
  where:
    'The consortium route description in the research route ledger, and the partner-network section of the homepage, which renders the seven marks.',
  status: 'site-published',
  countEstablished:
    'This register can establish that the site names seven organizations and renders seven marks: that is repository-verified, and the rows below are exactly those seven. It cannot establish that seven is the number of organizations in the consortium.',
  limits:
    'No source in this repository or in the external records this register cites states a consortium membership count, a consortium charter, or that the INSTAR Consortium is a legal entity, a joint venture, or a membership organization at all. The count is the site’s own, and the register records it as the site’s own.',
};

export interface ConsortiumAffiliation {
  readonly organization: string;
  /** The mark the homepage renders for this organization. */
  readonly markPath: string;
  /**
   * The mark's recorded provenance, which is a separate question from the
   * relationship. Every partner mark in the media policy is `unverified`.
   */
  readonly markProvenance: 'unverified';
  /** The outbound link the homepage publishes for this organization, if any. */
  readonly outbound: string | null;
  readonly relationship: string;
  readonly status: RegisterStatus;
  readonly basis: string;
  readonly limits: string;
}

const markLimit =
  'The mark itself is a separate question from the relationship: the media policy records no partner-provided source record and no confirmed licence for this mark, so its use here is a repository fact rather than a documented permission.';

const unverifiedLimit =
  'The site names this organization as a consortium partner. No partner-provided source record, agreement, or confirmation is attached to it in this repository, and this register does not invent one to fill the row.';

export const recordConsortiumAffiliations: readonly ConsortiumAffiliation[] = [
  {
    organization: 'Focus Hive Inc.',
    markPath: '/img/brand-logo/focus-hive.svg',
    markProvenance: 'unverified',
    outbound: 'https://focushive.com',
    relationship: 'Named on the homepage partner network and on the consortium route.',
    status: 'unverified',
    basis: 'The site’s own partner list. The organization’s mark and an external link are published.',
    limits: `${unverifiedLimit} ${markLimit}`,
  },
  {
    organization: 'Global Enterprise',
    markPath: '/img/brand-logo/global-enterprise.svg',
    markProvenance: 'unverified',
    outbound: 'https://globalenterprise.com',
    relationship: 'Named on the homepage partner network and on the consortium route.',
    status: 'unverified',
    basis: 'The site’s own partner list. The organization’s mark and an external link are published.',
    limits: `${unverifiedLimit} ${markLimit}`,
  },
  {
    organization: 'Ravonics LLC',
    markPath: '/img/brand-logo/ravonics.svg',
    markProvenance: 'unverified',
    outbound: 'https://ravonics.com',
    relationship:
      'The owner has confirmed the affiliation. The site describes drone-sensing work developed with Ravonics LLC, a HUBZone defense contractor in West Virginia, and names the organization in the research and record-room copy.',
    status: 'owner-confirmed',
    basis:
      'Owner confirmation, and the site’s own research copy, which names the organization and the joint subject area rather than only displaying a mark.',
    limits: `This is the only affiliation in this register confirmed by the institution’s owner. That makes the relationship confirmed; it does not make any contract, award, or scope of work confirmed, and the register claims none. ${markLimit}`,
  },
  {
    organization: 'Curiosity Research Corporation',
    markPath: '/img/brand-logo/curiosity-research.svg',
    markProvenance: 'unverified',
    outbound: 'https://curiositycorp.org',
    relationship: 'Named on the homepage partner network and on the consortium route.',
    status: 'unverified',
    basis: 'The site’s own partner list. The organization’s mark and an external link are published.',
    limits: `${unverifiedLimit} ${markLimit}`,
  },
  {
    organization: 'Tao Learning',
    markPath: '/img/brand-logo/tao-learning.svg',
    markProvenance: 'unverified',
    outbound: 'https://taolearning.org',
    relationship: 'Named on the homepage partner network and on the consortium route.',
    status: 'unverified',
    basis: 'The site’s own partner list. The organization’s mark and an external link are published.',
    limits: `${unverifiedLimit} ${markLimit}`,
  },
  {
    organization: 'Dream Limited',
    markPath: '/img/brand-logo/dream-limited.svg',
    markProvenance: 'unverified',
    outbound: null,
    relationship: 'Named on the homepage partner network and on the consortium route.',
    status: 'unverified',
    basis: 'The site’s own partner list. The organization’s mark is published without an outbound link.',
    limits: `${unverifiedLimit} No outbound link is published for this organization, so a reader cannot check it from this page. ${markLimit}`,
  },
  {
    organization: 'World Enterprise Group',
    markPath: '/img/brand-logo/world-enterprise-group.svg',
    markProvenance: 'unverified',
    outbound: null,
    relationship: 'Named on the homepage partner network and on the consortium route.',
    status: 'unverified',
    basis: 'The site’s own partner list. The organization’s mark is published without an outbound link.',
    limits: `${unverifiedLimit} No outbound link is published for this organization, so a reader cannot check it from this page. ${markLimit}`,
  },
] as const;

export interface NamedPersonRow {
  readonly name: string;
  /** The role line as the homepage displays it. Described, not adopted. */
  readonly displayedRole: string;
  readonly portraitPath: string;
  readonly status: RegisterStatus;
  readonly basis: string;
  readonly limits: string;
}

/**
 * The four people the homepage presents, carried with what establishes them.
 *
 * These are appointments, not biographies. No repository source establishes any
 * of the four, and the register says so on each row rather than on the page,
 * because a single page-level disclaimer is exactly the kind of thing a reader
 * skims past while the table above it still looks authoritative.
 *
 * The credential rule is the reason this register is worth having at all. The
 * homepage renders one of these entries with a doctoral honorific, and nothing
 * in this repository establishes a doctorate for that person. A register that
 * reproduced the honorific would launder an unverified credential into a
 * governance document, so it does not: the row carries the name as the site
 * gives it and the role as the site gives it, and it states plainly that the
 * honorific is a claim the institution has not evidenced here.
 */
export const recordNamedPeople: readonly NamedPersonRow[] = [
  {
    name: 'Suzanne Conejos',
    displayedRole: 'AI Lead Scientist · Board Member',
    portraitPath: '/img/volunteers/suzanne-conejos.avif',
    status: 'unverified',
    basis: 'The homepage leadership preview. The board appointment is also carried in the governance register.',
    limits:
      'No repository source, board resolution, or external record establishes this appointment or this role. No degree, certification, or professional title is asserted for this person anywhere in this register.',
  },
  {
    name: 'Sean Hackney',
    displayedRole: 'Board Member · AI Researcher',
    portraitPath: '/img/volunteers/sean-hackney.avif',
    status: 'unverified',
    basis: 'The homepage leadership preview. The board appointment is also carried in the governance register.',
    limits:
      'No repository source, board resolution, or external record establishes this appointment or this role. No degree, certification, or professional title is asserted for this person anywhere in this register.',
  },
  {
    name: 'Spoogmay',
    displayedRole: 'Applied Scientist · Materials Physics',
    portraitPath: '/img/volunteers/spoogmay-khan.avif',
    status: 'unverified',
    basis: 'The homepage leadership preview.',
    limits:
      'No repository source establishes this appointment. The homepage renders this entry with a doctoral honorific on the person’s name; nothing in this repository establishes a doctorate, so the register carries the name and the role line without it. The honorific remains an unevidenced credential on the public page, and that is recorded here rather than repeated.',
  },
  {
    name: 'Maha Khan',
    displayedRole: 'Research Scientist',
    portraitPath: '/img/volunteers/maha-khan.avif',
    status: 'unverified',
    basis: 'The homepage leadership preview.',
    limits:
      'No repository source establishes this appointment or this role. No degree, certification, or professional title is asserted for this person anywhere in this register.',
  },
] as const;

/** Affiliations the owner has confirmed. Derived, so the page cannot overstate it. */
export const recordOwnerConfirmedAffiliationCount = recordConsortiumAffiliations.filter(
  (affiliation) => affiliation.status === 'owner-confirmed',
).length;

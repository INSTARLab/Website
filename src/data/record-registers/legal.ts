/**
 * Legal status, the determination letter, the §6104(d) records-request path,
 * and the filing record.
 *
 * This is the part of the record room that makes a statement about the
 * institution's legal standing, so it is also the part that has to be strictest
 * about where each sentence comes from. Every field names the source that
 * carries it, and the three sources are kept apart on purpose:
 *
 *   - the served IRS determination letter, which is the institution's own
 *     document and is the only source for the exemption classification and the
 *     effective date;
 *   - the Ohio Attorney General charitable-registration record, which is a
 *     state filing about the institution;
 *   - the site's own identity source, which is repository data and proves only
 *     that the site says so.
 *
 * The filing record at the bottom is the most carefully worded passage here.
 * See `recordFilingRecord` — it states what a bulk dataset shows and refuses to
 * convert that into a statement about the institution's conduct.
 */

import type { RegisterRow, RegisterStatus } from './types';

export type LegalStatusField = RegisterRow;

/**
 * The date the external records below were last opened and read. The room uses
 * one retrieval date per register rather than one per row, because every row
 * here was checked in the same pass.
 */
export const legalRegisterRetrievedAt = '2026-09-14' as const;

export const recordLegalStatus: readonly LegalStatusField[] = [
  {
    field: 'Legal name',
    value: 'INSTAR Lab Inc.',
    basis: 'Site identity source; consistent with the served IRS determination letter and the Ohio Attorney General record.',
    status: 'repo-verified',
    limits: 'The site identity source is repository data. It establishes what the site publishes, not what a registry holds.',
  },
  {
    field: 'IRS employer identification number',
    value: '85-0845517',
    basis: 'Served IRS determination letter; the Nonprofit Explorer entry is keyed to the same number.',
    status: 'repo-verified',
    limits: 'An EIN identifies an entity to the IRS. It is not a registration, a certification, or evidence of standing in any program.',
  },
  {
    field: 'Exemption',
    value: 'Exempt under IRC §501(c)(3)',
    basis: 'Served IRS determination letter.',
    status: 'repo-verified',
    limits: 'The letter is the institution’s own document. It is not a current-status check; exemption can be revoked, and this register does not re-check it against the IRS on every build.',
  },
  {
    field: 'Public charity classification',
    value: 'Public charity under IRC §170(b)(1)(A)(vi)',
    basis: 'Served IRS determination letter. This classification was misstated on this site until 16 June 2026 — see the corrections register, COR-004.',
    status: 'repo-verified',
    limits: 'The classification is what makes contributions deductible. §170(b)(1)(A)(vi) is the basis the letter states; no other subsection is claimed here.',
  },
  {
    field: 'Ruling effective date',
    value: '27 April 2020',
    basis: 'Served IRS determination letter.',
    status: 'repo-verified',
    limits: 'An effective date is the start of the exemption, not the date of incorporation and not a filing date.',
  },
  {
    field: 'State of registration',
    value: 'Ohio',
    basis: 'Ohio Attorney General charitable-registration record.',
    status: 'external-record',
    limits: 'This is a state charitable-solicitation registration, not the state of incorporation, and not an IRS registration.',
  },
  {
    field: 'Ohio Attorney General registration ID',
    value: '12174620',
    basis: 'Ohio Attorney General charitable-registration record.',
    status: 'external-record',
    limits: 'The registration must be renewed. The identifier is stable; the status behind it is not, and the record page is the authority on it.',
  },
  {
    field: 'Principal address',
    value: '125 Frederick St, Marietta, OH 45750-3407',
    basis: 'Site identity source; consistent with the served IRS determination letter.',
    status: 'repo-verified',
    limits: 'This is the address the institution publishes. This register does not publish a mailing address, a post-office box, or a registered-agent address, because no source here establishes one.',
  },
] as const;

export interface RecordDeterminationLetter {
  readonly label: string;
  readonly path: string;
  readonly kind: string;
  readonly status: RegisterStatus;
  readonly retrievedAt: string;
  readonly summary: string;
  /** What reading the served document itself establishes. */
  readonly confirms: readonly string[];
  readonly limits: string;
}

/**
 * The served determination letter, at its stable public URL.
 *
 * This entry used to be marked review-required on the grounds that the
 * filename was not proof of the document's type. That caution was right about
 * filenames and wrong about this file: the served PDF was read directly, and
 * it confirms the employer identification number, the §501(c)(3) exemption,
 * the §170(b)(1)(A)(vi) public-charity classification, the 27 April 2020
 * effective date and the Marietta address. Under-claiming your own evidence is
 * also a fault — it pushes readers toward third-party summaries that are
 * weaker than the document the institution already serves.
 */
export const recordDeterminationLetter: RecordDeterminationLetter = {
  label: 'IRS determination letter (EIN 85-0845517)',
  path: '/docs/irs-determination-letter-85-0845517.pdf',
  kind: 'PDF',
  status: 'repo-verified',
  retrievedAt: '2026-09-14',
  summary:
    'The institution’s IRS determination letter, served from this site at a stable URL and readable in a browser without a session, a login, or a search form.',
  confirms: [
    'The employer identification number 85-0845517.',
    'Exemption under IRC §501(c)(3).',
    'Classification as a public charity under IRC §170(b)(1)(A)(vi) rather than as a private foundation.',
    'A ruling effective 27 April 2020.',
    'The Marietta, Ohio address published in the site identity source.',
  ],
  limits:
    'It is a scanned document, so the fields above are read from the served artifact rather than parsed from it. It establishes the classification as of the ruling; it is not a current-status check, and it is not a Form 990 of any year.',
};

export interface RecordRecordsRequest {
  readonly statutoryBasis: string;
  readonly obligation: string;
  readonly route: string;
  readonly addressLines: readonly string[];
  readonly available: readonly string[];
  readonly notAvailable: readonly string[];
  readonly limits: string;
}

/**
 * The §6104(d) records-request path.
 *
 * IRC §6104(d) obliges a tax-exempt organization to provide its exemption
 * application and its annual returns to any person who requests them in
 * writing, and the whole point of putting the route on a public page is that a
 * reader should not have to know the statute to use it.
 *
 * The address is the verified principal address and nothing else. No
 * post-office box, no email alias and no telephone number is published here,
 * because no source in this repository establishes one for records requests,
 * and inventing a plausible one is exactly the failure mode this room exists
 * to avoid. A reader who already has a working contact route should use that
 * one instead.
 */
export const recordRecordsRequest: RecordRecordsRequest = {
  statutoryBasis: 'IRC §6104(d)',
  obligation:
    'A tax-exempt organization must provide its exemption application and its annual returns to any person who requests them in writing, without requiring a reason and without charging more than a reasonable reproduction and mailing cost. This is an obligation on the organization, not a favour it grants.',
  route:
    'Write to the institution at the principal address below. Say which documents you want and where they should be sent; the statute does not require a form, a reason, or any particular wording.',
  addressLines: ['INSTAR Lab Inc.', '125 Frederick St', 'Marietta, OH 45750-3407'],
  available: [
    'The exemption application and the IRS determination letter for the §501(c)(3) exemption — the determination letter is already served on this site.',
    'Annual returns and notices for the years the institution is required to file them, including the Form 990-N (e-Postcard) for years in which that is the applicable filing.',
  ],
  notAvailable: [
    'Documents that do not exist cannot be produced. Where a filing year has no returned document, the institution’s reply should say so rather than substitute an explanation.',
    'This register names no email address, telephone number or post-office box for records requests, because no source it cites establishes one for that purpose. Contact details the site publishes elsewhere are general contact routes; this register does not present them as a records-request channel.',
  ],
  limits:
    'The statute governs what the institution must provide and how long it has to respond. This page states the obligation and the route; it is not legal advice, and it is not a commitment about any individual request.',
};

export interface RecordFilingRecord {
  readonly id: string;
  readonly dataset: string;
  readonly publisher: string;
  readonly locator: string;
  readonly retrievedAt: string;
  readonly whatTheDatasetShows: string;
  readonly whatItDoesNotEstablish: string;
  readonly revocationStatus: string;
  readonly revocationRule: string;
  readonly unresolved: string;
  readonly limits: string;
}

/**
 * The filing record, as a bulk dataset shows it.
 *
 * The two sentences that matter are `whatItDoesNotEstablish` and `unresolved`.
 * A dataset that does not list a filing and a filing that was never made are
 * different claims, and nothing available from outside the IRS can tell them
 * apart: the file is re-cut on the publisher's schedule, its coverage is
 * described by the publisher in a way that does not settle the question, and
 * small filers have historically been unevenly represented in digitized
 * records. So this register states the observation, states what would be needed
 * to turn it into a finding, and records the gap as unresolved. It does not
 * assert that INSTAR Lab failed to file in any year, and it does not assert the
 * opposite.
 */
export const recordFilingRecord: RecordFilingRecord = {
  id: 'FIL-001',
  dataset: 'IRS Form 990-N (e-Postcard) filing data',
  publisher: 'Internal Revenue Service',
  locator: 'https://www.irs.gov/charities-non-profits/tax-exempt-organization-search-bulk-data-downloads',
  retrievedAt: '2026-09-14',
  whatTheDatasetShows:
    'Within the filing data the institution checked, exactly one INSTAR Lab filing appears: tax year 2025. No earlier INSTAR Lab filing appears in that data.',
  whatItDoesNotEstablish:
    'An absent row in a bulk file is not the same claim as a filing that was never made, and this register cannot tell the two apart from outside the IRS. The publisher describes this dataset as the most recent e-Postcard filings on record and does not state a coverage start year for it on the page it serves, so the register does not state one either. Digitized filing data for small filers is re-cut on the publisher’s schedule and has historically been unevenly complete. Nothing on this page asserts that INSTAR Lab failed to file in any year, and nothing on it asserts that INSTAR Lab filed in any year other than the one disclosed above.',
  revocationStatus:
    'The institution reports that INSTAR Lab does not appear on the IRS automatic-revocation list. That is the institution’s check, not this register’s: the list is served through a search tool rather than a stable document URL, so the register cannot re-run the check on every build and does not pretend to.',
  revocationRule:
    'Automatic revocation follows three consecutive years without a required filing, and it is effective on the original due date of the third return or notice. The rule and the list are described on the IRS page linked below.',
  unresolved:
    'The gap between one listed filing and the institution’s years of operation is unresolved, and this register records it as unresolved rather than explaining it away. Closing it needs a source this register does not have — the institution’s own filing acknowledgements, or a response from the IRS — and until one of those is produced, the honest state of this row is that it is open.',
  limits:
    'A bulk filing dataset is published by a third party on its own schedule. It is evidence of what is in the file, and of nothing beyond the file.',
};

export const recordFilingRevocationRuleLocator =
  'https://www.irs.gov/charities-non-profits/automatic-revocation-of-exemption' as const;

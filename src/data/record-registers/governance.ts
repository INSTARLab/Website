/**
 * The board register and the policy register.
 *
 * Both registers exist to publish what is sourced and to leave the rest visibly
 * blank. A governance table that quietly omits a row reads as complete, and a
 * reader has no way to tell an absent policy from an unpublishable one; so
 * every policy a donor or a board member would look for has a row, and the rows
 * with nothing behind them say so.
 *
 * Two rules are enforced in the data below rather than left to the page:
 *
 *   - No credential. No degree, title, or professional standing is asserted for
 *     any person, because no source in this repository establishes one. Where
 *     the public site displays a title, that display is described — it is not
 *     adopted as a fact.
 *   - No filled gap. The state filing reports a number of board members; it
 *     does not report their names. The site names some of them. The seats that
 *     nothing accounts for are published as unaccounted for.
 */

import type { RegisterRow } from './types';

export const governanceRegisterRetrievedAt = '2026-09-14' as const;

export interface BoardSeatRow {
  /** Which seat this row accounts for, in the order the register lists them. */
  readonly seat: string;
  readonly name: string | null;
  /** The role line exactly as a public source displays it, or null if none does. */
  readonly displayedRole: string | null;
  readonly basis: string;
  readonly status: RegisterRow['status'];
  readonly limits: string;
}

/**
 * The count first, then the seats.
 *
 * The Ohio Attorney General record reports how many board members the
 * institution filed. That is a real external fact and it is the strongest thing
 * this register has. It does not name them, so the names below come from the
 * institution's own public pages and are marked as the weaker thing they are.
 */
export const recordGovernanceCounts: readonly RegisterRow[] = [
  {
    field: 'Board members reported',
    value: '3',
    basis: 'Ohio Attorney General charitable-registration record, most recent filing year on record.',
    status: 'external-record',
    limits:
      'A count in a state filing is a self-reported figure for a filing year. It is not a current roster, and it says nothing about who holds the seats.',
  },
  {
    field: 'Board meetings reported',
    value: '1',
    basis: 'Ohio Attorney General charitable-registration record, most recent filing year on record.',
    status: 'external-record',
    limits:
      'The figure covers one filing year as reported. It is not a governance calendar and this register draws no conclusion from it about how often the board meets.',
  },
  {
    field: 'Audited financial statements',
    value: 'None filed with the state registration',
    basis: 'Ohio Attorney General charitable-registration record, most recent filing year on record.',
    status: 'external-record',
    limits:
      'This records what the registration states, which is that no audited statements were filed with it. It is not a statement about the institution’s internal accounting or about any audit performed for another purpose.',
  },
] as const;

export const recordBoardSeats: readonly BoardSeatRow[] = [
  {
    seat: 'Seat 1',
    name: 'Suzanne Conejos',
    displayedRole: 'AI Lead Scientist · Board Member',
    basis: 'The institution’s own public leadership preview.',
    status: 'site-published',
    limits:
      'The site displays this appointment. No repository source, board resolution, or external record in this register establishes it, and no degree, certification, or professional title is asserted for this person anywhere in this register.',
  },
  {
    seat: 'Seat 2',
    name: 'Sean Hackney',
    displayedRole: 'Board Member · AI Researcher',
    basis: 'The institution’s own public leadership preview.',
    status: 'site-published',
    limits:
      'The site displays this appointment. No repository source, board resolution, or external record in this register establishes it. The same credential rule applies: nothing here asserts a degree or a title.',
  },
  {
    seat: 'Seat 3',
    name: null,
    displayedRole: null,
    basis: 'The state filing reports three board members; the public site names two people as board members.',
    status: 'not-reported',
    limits:
      'Nothing in this repository or in the external records this register cites identifies the holder of this seat. The row is published empty on purpose: three of three seats are accounted for by the count, two of three by name, and the difference is the honest state of the record.',
  },
] as const;

/**
 * A policy register row is an ordinary register row. The row label names the
 * policy, and `status` carries what establishes it — the two are kept in the
 * same shape as every other register in this directory so a reader moving
 * between them is not learning a second table.
 */
export type PolicyRow = RegisterRow;

/**
 * The policy register.
 *
 * An unpublished policy is not the same as a missing one. The institution may hold an
 * internal policy that it has not published here; what this register records is
 * that no public source states it. The wording of each `limits` field says
 * exactly that, because a reader who takes a blank row for a missing control
 * will draw the wrong conclusion.
 */
export const recordPolicyRegister: readonly PolicyRow[] = [
  {
    field: 'Conflict of interest',
    value: 'Reported on file with the state registration',
    basis: 'Ohio Attorney General charitable-registration record, most recent filing year on record.',
    status: 'external-record',
    limits:
      'The registration reports that a conflict-of-interest policy exists. The policy itself is not published on this site, so its terms, its scope and its review cadence cannot be read from here.',
  },
  {
    field: 'Document retention',
    value: 'Not yet published on this site',
    basis: 'No source in this repository states a document-retention policy.',
    status: 'not-reported',
    limits:
      'Absence from this page is absence of a published source, not evidence that no policy exists. A retention policy would also govern the records requested under IRC §6104(d), so the legal-status register states that request path separately rather than implying it from this row.',
  },
  {
    field: 'Whistleblower',
    value: 'Not yet published on this site',
    basis: 'No source in this repository states a whistleblower policy.',
    status: 'not-reported',
    limits:
      'Absence of a published source, not of a policy. This register does not offer a reporting channel of its own; a reader with a concern should use the contact route the site already publishes.',
  },
  {
    field: 'Gift acceptance',
    value: 'Not yet published on this site',
    basis: 'No source in this repository states a gift-acceptance policy.',
    status: 'not-reported',
    limits:
      'Absence of a published source, not of a policy. Until a gift-acceptance policy is published, this register does not describe what the institution will or will not accept, and no page of this site should be read as doing so.',
  },
  {
    field: 'Financial controls',
    value: 'Not yet published on this site',
    basis: 'No source in this repository states a financial-controls policy.',
    status: 'not-reported',
    limits:
      'Absence of a published source, not of a control. The operational measures published elsewhere in this record room carry an approval basis of their own; that basis is not a substitute for a described control environment, and this row does not treat it as one.',
  },
] as const;

/**
 * Counts for the page summary. They are derived from the rows rather than
 * typed in, so the page cannot claim a number the register does not carry, and
 * they are kept apart because "reported to exist" and "no published source"
 * are the two different things this register is trying to separate.
 */
export const recordPolicyReportedCount = recordPolicyRegister.filter((row) => row.status === 'external-record').length;
export const recordPolicyNotReportedCount = recordPolicyRegister.filter((row) => row.status === 'not-reported').length;

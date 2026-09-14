/**
 * Shared vocabulary for the institutional registers.
 *
 * The record room already distinguishes what it can evidence from what it
 * cannot: `RecordSource` carries `verified-in-repository | review-required |
 * not-public`, and `RecordFile` carries `published | review-required |
 * source-only`. Those two vocabularies answer "where did this come from?" for
 * sources and files. The registers in this directory answer a different
 * question — "who says this, and what would it take to check it?" — for claims
 * about the institution itself, so they carry their own status vocabulary.
 *
 * The rule that keeps the registers honest is that the status is about the
 * *evidence*, never about the *claim*. A row marked `unverified` does not say
 * the affiliation is false; it says no source in this repository, and no
 * external record this register cites, establishes it. A row marked
 * `not-reported` is not an assertion of absence either: the institution may
 * hold a policy or a record that is simply not published. Every register page
 * renders these definitions next to its rows so a reader never has to guess
 * which of the two they are looking at.
 */
export type RegisterStatus =
  /** The institution's owner confirmed the statement for publication. */
  | 'owner-confirmed'
  /** A named third-party record states it, and this register says which. */
  | 'external-record'
  /** Present in the checked-out source that produced this build. */
  | 'repo-verified'
  /** The public site states it. Nothing else in this register corroborates it. */
  | 'site-published'
  /** Published, but no source here establishes it. Not a claim that it is false. */
  | 'unverified'
  /** No source states it. The row exists to publish the absence, not to fill it. */
  | 'not-reported';

export interface RegisterStatusDefinition {
  readonly key: RegisterStatus;
  readonly label: string;
  readonly description: string;
  readonly action: string;
  readonly className: string;
}

export const registerStatusDefinitions: readonly RegisterStatusDefinition[] = [
  {
    key: 'owner-confirmed',
    label: 'Owner confirmed',
    description: 'The institution’s owner confirmed the statement for publication.',
    action: 'Treat as the institution’s own position, and say so when quoting it.',
    className: 'text-bg-success',
  },
  {
    key: 'external-record',
    label: 'External record',
    description: 'A named third-party record states it. The register names the publisher and the limit.',
    action: 'Attribute it to the publisher; it is their statement, not the institution’s.',
    className: 'text-bg-success',
  },
  {
    key: 'repo-verified',
    label: 'Verified in repository',
    description: 'Present in the checked-out source that produced this build.',
    action: 'Use within its stated scope. It is not an external verification.',
    className: 'text-bg-info',
  },
  {
    key: 'site-published',
    label: 'Site published',
    description: 'The public site states it and nothing else in this register corroborates it.',
    action: 'Read it as the site’s claim, not as a verified fact.',
    className: 'text-bg-warning',
  },
  {
    key: 'unverified',
    label: 'Unverified',
    description: 'Published, but no source in this register establishes it. Not a claim that it is false.',
    action: 'Do not promote it into a stronger claim. Ask the institution for the source.',
    className: 'text-bg-warning',
  },
  {
    key: 'not-reported',
    label: 'Not reported',
    description: 'No source states it. The row publishes the absence rather than filling it.',
    action: 'Read the blank as a blank. It is not evidence that the thing does not exist.',
    className: 'text-bg-secondary',
  },
] as const;

/**
 * One row of a register. The shape is the same everywhere in this directory
 * because the discipline is the same everywhere: a value, the basis that
 * carries it, the status of that basis, and the limit that travels with it.
 * A register row without a stated limit is a claim wearing a table's clothes.
 */
export interface RegisterRow {
  readonly field: string;
  readonly value: string;
  readonly basis: string;
  readonly status: RegisterStatus;
  readonly limits: string;
}

export function registerStatusDefinition(status: RegisterStatus): RegisterStatusDefinition {
  const found = registerStatusDefinitions.find((definition) => definition.key === status);
  if (!found) throw new Error(`Unknown register status: ${status}`);
  return found;
}

export function registerStatusCounts(
  entries: readonly { readonly status: RegisterStatus }[],
): readonly (RegisterStatusDefinition & { readonly count: number })[] {
  return registerStatusDefinitions.map((definition) => ({
    ...definition,
    count: entries.filter((entry) => entry.status === definition.key).length,
  }));
}

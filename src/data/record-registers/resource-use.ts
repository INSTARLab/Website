/**
 * The resource-use register: money, measurement, and the first-grant review.
 *
 * A foundation program officer opening a first grant to a small, young,
 * unaudited 501(c)(3) asks a short list of questions — what is the legal
 * standing, how much of the money reaches program, who stands behind the
 * published figures, how is the work measured, and where is the evaluation
 * plan. A donor asks a shorter one: where does a gift go, and is it
 * restricted. A board member asks whether a budget and a financial statement
 * exist and who signed them.
 *
 * This register carries those questions in the register shape the rest of this
 * directory uses, and it obeys the same rule: the status describes the
 * evidence, never the claim. Most of the answers here are published as
 * absences, and that is the finding. A room that publishes the program-service
 * ratio and silently omits who approved the underlying figures has published
 * the flattering half of a due-diligence file.
 *
 * Three rules are enforced in the data rather than left to the page:
 *
 *   - No approval is upgraded. The operational measures this room publishes
 *     carry a management attestation: no board resolution and no audit has
 *     approved them. The register says so in the row next to the ratio rather
 *     than in a footnote a reader can skip.
 *   - No figure is restated as the institution's own. Where a number exists
 *     only in a state filing, the row names the publisher that states it, and
 *     the limit travels in the same row as the value.
 *   - What is derivable is derived. The grant and contribution rows are read
 *     off the approved operational snapshot at build time, so the register
 *     cannot claim a number the snapshot does not carry.
 */

import {
  recordBiMetricDefinition,
  recordBiMetricDefinitions,
  recordBiObservations,
  recordBiValueStateForMetric,
} from '../record-bi';
import type { RegisterRow } from './types';

export const resourceUseRegisterRetrievedAt = '2026-09-14' as const;

/**
 * The grant position, read off the approved snapshot rather than typed in.
 *
 * The institution attests that no grant award has been made to it. That
 * attestation reaches the page as three measured zeros — one per funder type
 * the measure defines — so the register sums what is published instead of
 * repeating the sentence. A row that hard-coded "0" would still say zero on a
 * build where the snapshot had been withdrawn; a row that sums the snapshot
 * cannot.
 */
const grantsAwardedMetric = recordBiMetricDefinition('grants-awarded');
const grantObservations = recordBiObservations.filter((observation) => observation.metricId === 'grants-awarded');
const measuredGrantObservations = grantObservations.filter((observation) => observation.value !== null);
const measuredGrantTotal = measuredGrantObservations.reduce((total, observation) => total + (observation.value ?? 0), 0);
const measuredFunderTypes = measuredGrantObservations
  .map((observation) => observation.dimensions['funder-type'])
  .filter((funderType): funderType is string => Boolean(funderType));
const grantValue = measuredGrantObservations.length === 0
  ? 'Not reported'
  : `${measuredGrantTotal.toLocaleString('en-US')} ${grantsAwardedMetric?.unit ?? 'USD'} awarded to INSTAR Lab, across the ${measuredFunderTypes.join(', ')} funder ${measuredFunderTypes.length === 1 ? 'type' : 'types'} the measure defines`;

/**
 * Contributions, carried as the snapshot's value state and nothing more.
 *
 * The institution reports that private donations have been received and that
 * they have been materially helpful, and it has published no amount, no donor
 * and no per-donor detail. The approved observation therefore exists with an
 * unavailable value, which is the one state that can say "a position was taken
 * and the position is that the figure is not published" without saying whether
 * anything was received.
 */
const contributionsState = recordBiValueStateForMetric('contributions-received');
const contributionsValue = contributionsState === 'measured'
  ? 'A measured value is published in the operational snapshot'
  : 'Not reported';

export const recordResourceUse: readonly RegisterRow[] = [
  {
    field: 'Program service share of expenses, as filed',
    value: '100.00% — program service expenses $49,000 of total expenses $49,000, most recent filing year on record',
    basis: 'Ohio Attorney General charitable-registration record (EXT-001), most recent filing year on record. The ratio is arithmetic on the figures that record publishes, and the figures stay attributed to it.',
    status: 'external-record',
    limits:
      'A ratio computed from a self-reported state charitable-registration filing for one filing year. It is not an audited functional-expense statement, it is not a current-year balance, and it says nothing about any other year. This register does not restate the underlying figures as the institution’s own measures.',
  },
  {
    field: 'Who stands behind the published operational measures',
    value: 'A management attestation of 2026-09-13. No board resolution and no audit has approved them.',
    basis: 'The approved operational snapshot and its approval fields (SRC-007), which carry the approval status, the approval basis, the approver and the approval date.',
    status: 'repo-verified',
    limits:
      'The approval basis is part of the published data, not an inference. A management attestation is the weakest of the three bases the snapshot can carry, and it is the one this snapshot carries: it is not a board resolution, not an audited statement and not an external filing. A reader weighing the program-service ratio above should weigh it with this row.',
  },
  {
    field: 'Measurement approach',
    value: `A published metric registry of ${recordBiMetricDefinitions.length} defined measures, each carrying its population, its exclusions, its unit, its aggregation grain, and a named review owner and review date`,
    basis: 'The record-room metric registry and the approved operational snapshot (SRC-007). The definitions are published, and the snapshot publishes the observations made against them.',
    status: 'repo-verified',
    limits:
      'A registry of definitions is a measurement framework: it fixes what a number means, what it excludes, and when it is reviewed. It is not an approved evaluation plan, it is not a logic model, and it is not an outcome study. No measure in it has yet been reported against for a completed year.',
  },
  {
    field: 'Evaluation and outcome reporting',
    value: 'Not reported',
    basis: 'No source in this repository states an evaluation plan, a logic model, a third-party evaluation, or an outcome measure for any program.',
    status: 'not-reported',
    limits:
      'Absence of a published source, not evidence that none exists. An evaluation the institution holds and has not published is outside this register, and a funder’s own measurement requirements are not addressed by this row either. It records that nothing is published, and it is published as an absence rather than left off the table.',
  },
  {
    field: 'Board-approved budget or financial statement',
    value: 'Not reported',
    basis: 'No source in this repository publishes a budget, a board-approved financial statement, or a board resolution concerning the institution’s finances.',
    status: 'not-reported',
    limits:
      'Absence of a published source, not a missing control. A state filing reports the figures for one filed year; that is a filing, not a budget, and this register does not treat it as one. The governance register carries what the state registration does and does not say about audited statements.',
  },
  {
    field: 'Grant awards received to date',
    value: grantValue,
    basis: 'The approved operational snapshot (SRC-007), which carries the grant measure as a measured zero for each funder type the definition declares.',
    status: 'repo-verified',
    limits:
      'A published zero is a measured figure, not a missing one: it is the institution’s own attestation that no grant award has been made to it, by any of the funder types the measure defines. It is not an external check, it does not establish that no application is under review, and it is not a statement about any proposal or pledge.',
  },
  {
    field: 'Charitable contributions received',
    value: contributionsValue,
    basis: 'The approved operational snapshot (SRC-007), which carries an approved observation for this measure whose value is unavailable.',
    status: 'repo-verified',
    limits:
      'The measure is approved and its value is not published: no amount, no donor name and no donor-level record appears anywhere in this room. This row does not say whether any contribution was received, because nothing on file here establishes it either way, and it is deliberately not a nominal zero.',
  },
  {
    field: 'Restricted and unrestricted contributions',
    value: 'Not reported',
    basis: 'No source in this repository states a restriction policy, a fund-balance position, or a restriction attached to any contribution.',
    status: 'not-reported',
    limits:
      'Absence of a published source, not evidence that no restricted funds exist. Until a gift-acceptance and restriction policy is published, this register does not describe what the institution will or will not accept, and no page of this site should be read as doing so. The policy register carries the gift-acceptance row separately.',
  },
  {
    field: 'Designated use of a gift',
    value: 'Not reported',
    basis: 'No approved allocation, stewardship or designation statement is published in this repository.',
    status: 'not-reported',
    limits:
      'Absence of a published source, not an absence of intent. The public research, fellowship and support routes describe research themes and ways to engage; a route is not an allocation statement, and this register does not offer one on the institution’s behalf. The program-service share above describes how one filed year’s expenses were classified, which is a different question.',
  },
] as const;

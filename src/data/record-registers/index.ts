/**
 * The institutional registers.
 *
 * Four registers that answer four different questions a reader brings to a
 * nonprofit's public record — who governs it and under what policies, what its
 * legal standing is and what has it filed, who it says it works with, and what
 * it has got wrong and corrected. They live in their own directory rather than
 * in `src/data/record.ts` for the same reason `src/data/record-bi/` does: each
 * one carries its own vocabulary and its own limits, and the shared route
 * ledger should not have to hold them all in one file.
 *
 * What they have in common is the rule stated in `./types.ts`: the status
 * describes the evidence, never the claim. Where nothing establishes a row, the
 * row says so and is published anyway.
 */

export {
  registerStatusCounts,
  registerStatusDefinition,
  registerStatusDefinitions,
} from './types';
export type { RegisterRow, RegisterStatus, RegisterStatusDefinition } from './types';

export {
  correctionCommitLocator,
  correctionMirrorRepository,
  recordCorrectionCount,
  recordCorrections,
} from './corrections';
export type { CorrectionCommit, RecordCorrection } from './corrections';

export {
  legalRegisterRetrievedAt,
  recordDeterminationLetter,
  recordFilingRecord,
  recordFilingRevocationRuleLocator,
  recordLegalStatus,
  recordRecordsRequest,
} from './legal';
export type {
  LegalStatusField,
  RecordDeterminationLetter,
  RecordFilingRecord,
  RecordRecordsRequest,
} from './legal';

export {
  governanceRegisterRetrievedAt,
  recordBoardSeats,
  recordGovernanceCounts,
  recordPolicyNotReportedCount,
  recordPolicyRegister,
  recordPolicyReportedCount,
} from './governance';
export type { BoardSeatRow, PolicyRow } from './governance';

export {
  affiliationRegisterRetrievedAt,
  recordConsortiumAffiliations,
  recordConsortiumClaim,
  recordNamedPeople,
  recordOwnerConfirmedAffiliationCount,
} from './affiliations';
export type { ConsortiumAffiliation, ConsortiumClaim, NamedPersonRow } from './affiliations';

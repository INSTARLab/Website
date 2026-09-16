/**
 * Blocked-with-owner register for the seven RR-208 operational domains that
 * carry no publishable value in the current snapshot.
 *
 * Data lives in `blocked-domains.json` (readable from both Astro and plain
 * Node tests); this module adds the types and presentation helpers. It
 * publishes no numbers. Every entry renders as Not reported with the
 * responsible owner and the exact missing dependency, so the room can say
 * "blocked" without ever printing a zero it was not given. Missing is not
 * zero; a measured zero lives only in `current.json` for the two CEO-attested
 * measures (grants-awarded, publications) and never here.
 *
 * Owner strings reuse the role already attested in the snapshot
 * ("Chief Executive Officer, INSTAR Lab Inc.") rather than naming a person,
 * because no source supports a personal name here.
 */
import blockedRegistry from './blocked-domains.json';

export type RecordBiBlockedDomainId =
  | 'active-projects'
  | 'active-partnerships'
  | 'contributions'
  | 'revenue'
  | 'outputs'
  | 'datasets'
  | 'transfers';

export type RecordBiBlockedState = 'unavailable' | 'no-snapshot';

export interface RecordBiBlockedDomain {
  readonly id: RecordBiBlockedDomainId;
  readonly label: string;
  /** Approved metric id when a definition exists; null when no definition exists. */
  readonly metricId: string | null;
  /**
   * `unavailable`: an approved observation exists and its value is explicitly
   * not published. `no-snapshot`: no approved definition/observation exists.
   * Both render as Not reported; they are different facts about why.
   */
  readonly state: RecordBiBlockedState;
  readonly owner: string;
  readonly nextAction: string;
  readonly missingDependency: string;
}

export const RECORD_BI_BLOCKED_OWNER: string = (blockedRegistry as { owner: string }).owner;

export const recordBiBlockedDomains: readonly RecordBiBlockedDomain[] = (
  blockedRegistry as { domains: readonly RecordBiBlockedDomain[] }
).domains;

const blockedById = new Map(recordBiBlockedDomains.map((entry) => [entry.id, entry]));

export function recordBiBlockedDomain(id: RecordBiBlockedDomainId): RecordBiBlockedDomain | undefined {
  return blockedById.get(id);
}

/** Public copy for the blocked state. Both states render as Not reported. */
export function recordBiBlockedStateLabel(state: RecordBiBlockedState): string {
  return state === 'unavailable' ? 'Not reported · blocked with owner' : 'Not reported · no approved observation';
}

/**
 * The corrections register.
 *
 * A public claim that this site published and then withdrew is part of the
 * institution's record, so it is published here in the same room as everything
 * else rather than quietly disappearing into the commit log. Each entry states
 * what went out, what was wrong with it, what the site says now, when the
 * correction landed, and where a reader can check that it landed.
 *
 * The locator convention is deliberate and is the one thing that makes this
 * register different from the others: **entries cite commit SHAs, and they do
 * not reproduce the verbatim text of a retracted fabricated identifier** —
 * including the identifier that was invented for INSTAR Lab and removed in
 * June 2026. instarlab.org emits JSON-LD on every route, so writing an
 * invented federal identifier into a page risks putting it into machine-
 * readable output on the organization's own domain, where a crawler or a
 * clearinghouse would read it as a fact about the organization. The commit
 * page the citation points at is a strictly better place for that string to
 * sit: it is a record of the edit, not a claim the site is making.
 *
 * The gate in `scripts/quality/check-dist-provenance.mjs` enforces both halves
 * of that convention against the built artifact: no retracted identifier in
 * `dist/`, and no commit SHA in any structured data, meta tag, or sitemap.
 */

export interface CorrectionCommit {
  readonly sha: string;
  readonly committedAt: string;
  readonly summary: string;
  /**
   * Whether the commit is reachable on the public GitHub mirror at the time
   * this register was written. The mirror is populated by the promotion step,
   * so a commit that landed on the working branch is genuinely not there yet.
   * The page states that rather than linking a reader to a 404.
   */
  readonly mirrorState: 'public' | 'pending-promotion';
}

export interface RecordCorrection {
  readonly id: string;
  /** The claim or surface that was wrong, named the way a reader would name it. */
  readonly subject: string;
  /**
   * When the defective claim went out. `null` means the repository does not
   * establish it — the early content is imported template material — and the
   * page prints the absence instead of a plausible-looking date. Never guess:
   * a correction register that dates a claim it cannot date has merely
   * replaced one unsourced statement with another.
   */
  readonly publishedAt: string | null;
  /** When the correcting commit landed. Always evidenced by `commits`. */
  readonly correctedAt: string;
  readonly published: string;
  readonly defect: string;
  readonly correction: string;
  readonly scope: string;
  /**
   * True when the retracted material included a fabricated identifier, which is
   * the case the register deliberately describes without reproducing.
   */
  readonly withholdsRetractedIdentifiers: boolean;
  readonly commits: readonly CorrectionCommit[];
}

export const correctionMirrorRepository = 'https://github.com/INSTARLab/Website' as const;

/**
 * The public locator for a correction. A commit already on the mirror gets a
 * link; one that the promotion step has not carried yet gets its SHA as text,
 * because a link a reader cannot follow is worse than an honest citation.
 */
export function correctionCommitLocator(commit: CorrectionCommit): string | null {
  return commit.mirrorState === 'public'
    ? `${correctionMirrorRepository}/commit/${commit.sha}`
    : null;
}

export const recordCorrections: readonly RecordCorrection[] = [
  {
    id: 'COR-001',
    subject: 'Federal STTR participation',
    publishedAt: '2026-09-13',
    correctedAt: '2026-09-13',
    published:
      'On 13 September 2026 the site removed its STTR language sitewide and replaced it with a disclaimer stating that INSTAR Lab "has not participated in the federal STTR program" and does not hold itself out as an STTR research-institution partner.',
    defect:
      'The disclaimer was false. INSTAR Lab participates in STTR as a 501(c)(3) nonprofit research institution partner to small businesses. A correction that over-corrects in the negative direction is still a false statement about the institution, and this one contradicted the owner-confirmed position it was meant to protect.',
    correction:
      'Reverted the same day. STTR participation language is restored, the drone-sensing partner is named, and the claim is scoped to participation: participation, partnership, pathway and engagement appear, and no award, contract, registration, credential or performance result is claimed anywhere.',
    scope:
      'Sitewide. The tech-transfer route record, the record room federal route and its institutional-partner brief, the research funding and opportunities copy, the community partner and work-with-us copy, the enterprise R&D and portfolio positioning, and the homepage call to action all carried the disclaimer.',
    withholdsRetractedIdentifiers: false,
    commits: [
      { sha: 'b58436297690075aa7db7720299f9afad4f035da', committedAt: '2026-09-13', summary: 'Introduced the disclaimer and removed the STTR language.', mirrorState: 'pending-promotion' },
      { sha: '008bbd6d3b2a3cba10f8213706f286accbab329a', committedAt: '2026-09-13', summary: 'Reverted the disclaimer and restored the participation language.', mirrorState: 'pending-promotion' },
      { sha: '2081e63ac1dd6659ca8673a99c702136e25e6aa1', committedAt: '2026-09-13', summary: 'Scoped the claim to participation and removed an unsourced quantifier.', mirrorState: 'pending-promotion' },
    ],
  },
  {
    id: 'COR-002',
    subject: 'STTR standing and an unsourced quantity',
    publishedAt: '2026-06-15',
    correctedAt: '2026-09-13',
    published:
      'The STTR Programs page described INSTAR Lab as a "qualified STTR research institution partner", and the Research Portfolio page closed with "Several programs at SBIR/STTR readiness."',
    defect:
      '"Qualified" reads to a program officer or a donor as an approved or registered status, and INSTAR Lab holds no such status: it participates, without a landed contract. "Several" is an unsourced quantity, and it was doing no work the preceding sentence did not already do.',
    correction:
      'Restated as participation, with the 501(c)(3) standing sentence kept verbatim, and the quantifier dropped. No substitute number or status was introduced.',
    scope:
      'The STTR Programs route description and the Research Portfolio route description.',
    withholdsRetractedIdentifiers: false,
    commits: [
      { sha: '2081e63ac1dd6659ca8673a99c702136e25e6aa1', committedAt: '2026-09-13', summary: 'Restated the claim as participation and removed the quantifier.', mirrorState: 'pending-promotion' },
    ],
  },
  {
    id: 'COR-003',
    subject: 'Retracted federal identifiers',
    publishedAt: '2026-06-15',
    correctedAt: '2026-06-16',
    published:
      'The sitewide footer, a federal-identifiers block on the contact page, and the About Us and STTR copy published a SAM Unique Entity Identifier and a CAGE code as INSTAR Lab credentials — 46 files, including structured data.',
    defect:
      'Neither identifier was ever issued to INSTAR Lab. This was not a lapsed registration or a transcription error: the values were invented, and the site then used them as evidence of federal standing in copy written for grant and agency audiences.',
    correction:
      'Removed on 16 June 2026 from all affected files, including the structured data. This entry cites the commit and does not reproduce the values, and the values appear nowhere on this page, in any meta tag, in any sitemap, or in the JSON-LD this site emits. A build-time gate checks that on every build.',
    scope:
      '46 files at introduction, 61 files touched by the removal, spread across the footer of every navigation-reachable page, one contact-page block, and two content pages.',
    withholdsRetractedIdentifiers: true,
    commits: [
      { sha: '3337b68b05ca8cd1bc040284cda2fcdc6a9d91b6', committedAt: '2026-06-15', summary: 'Added the identifiers sitewide as credibility signals.', mirrorState: 'public' },
      { sha: 'c11e03c61653e722aa8f5e1c9cc8b9963df54491', committedAt: '2026-06-16', summary: 'Removed the fabricated identifiers from every affected file, including structured data.', mirrorState: 'public' },
    ],
  },
  {
    id: 'COR-004',
    subject: 'IRS exemption classification',
    publishedAt: '2026-06-15',
    correctedAt: '2026-06-16',
    published:
      'Five pages described INSTAR Lab Inc. as a "private operating foundation" — eight occurrences across the About page, the Mission page, the About Us page, the Leadership page and the Research Opportunities page.',
    defect:
      'The classification was wrong. INSTAR Lab Inc. is exempt under IRC §501(c)(3) and classified as a public charity under IRC §170(b)(1)(A)(vi). It is not a private foundation of any kind, and describing it as one understated its public support while misstating its exemption.',
    correction:
      'All eight occurrences corrected to the public-charity classification. The IRC §170 deductibility language was left intact, and the one remaining use of the phrase "private foundation" — a grant-writing context, not a classification claim — was correctly left alone.',
    scope:
      'Five pages, eight occurrences. The correction is the classification sentence; no other claim on those pages changed.',
    withholdsRetractedIdentifiers: false,
    commits: [
      { sha: 'd1869fad0a098005d67eb63151c6ee417f57d366', committedAt: '2026-06-16', summary: 'Corrected the classification to public charity under §170(b)(1)(A)(vi).', mirrorState: 'public' },
    ],
  },
  {
    id: 'COR-005',
    subject: 'Partner roles and invented methodology names',
    publishedAt: '2026-06-15',
    correctedAt: '2026-06-16',
    published:
      'The consortium partner cards and a research-innovation paragraph asserted specific roles for named partner organizations and named branded methodologies — "Focus Methodology", "DREAM Method" and "ORBITAL Method" among them — as a partner-to-role mapping.',
    defect:
      'The method names were sourced to no one, and the role mapping contradicted the canonical descriptions the same site publishes for those organizations. A partner organization was described as an assessment body on one page and as a workforce-performance company on another.',
    correction:
      'Replaced with each organization’s canonical one-line description and a neutral statement of the consortium’s shared contribution. No brand name was substituted and no role claim was replaced with a different role claim.',
    scope:
      'The seven consortium partner cards on the consortium route, and the partner-methodology paragraph on the research innovation route.',
    withholdsRetractedIdentifiers: false,
    commits: [
      { sha: '922c2d045385bead17bbec49e6bafb9552a9bffb', committedAt: '2026-06-16', summary: 'Replaced the invented partner bios with the canonical descriptions.', mirrorState: 'public' },
      { sha: '94b8c07061decfa79eaea5ae366d205fbc6e66db', committedAt: '2026-06-16', summary: 'Removed the branded methodology names and the partner-to-role mapping.', mirrorState: 'public' },
    ],
  },
  {
    id: 'COR-006',
    subject: 'Generated metrics, case studies, addresses and named individuals',
    publishedAt: null,
    correctedAt: '2026-06-15',
    published:
      'The site carried metrics, case-study narratives, postal addresses and named individuals that had been generated rather than sourced, alongside template filler on the About and Contact pages.',
    defect:
      'None of it was traceable to the institution. On a 501(c)(3) public charity’s public site, an unsourced figure and an unsourced named person are claims about the institution, and a reader has no way to tell them apart from sourced ones.',
    correction:
      'Removed on 15 June 2026, and the sitewide footer was normalized to the legal name, the EIN and the Marietta address the institution can evidence. The two fabricated federal identifiers introduced the same day are a separate entry above.',
    scope:
      '46 navigation-reachable pages rewritten. The exact introduction date is not established in the repository — the earliest content in the history is imported template material, so the published window is recorded as approximate.',
    withholdsRetractedIdentifiers: false,
    commits: [
      { sha: 'a3c5a970e1b7bfed9dc2c70f5f4a842a9669e39e', committedAt: '2026-06-15', summary: 'Removed the generated content and normalized the footer trust signals.', mirrorState: 'public' },
    ],
  },
] as const;

/**
 * Deliberately a count of the register, never of the defect class. It is used
 * in one place — the page lede — and it is derived so the page cannot claim a
 * number the register does not carry.
 */
export const recordCorrectionCount = recordCorrections.length;

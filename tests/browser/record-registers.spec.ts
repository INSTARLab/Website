import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

import {
  correctionCommitLocator,
  recordBoardSeats,
  recordConsortiumAffiliations,
  recordConsortiumClaim,
  recordCorrections,
  recordDeterminationLetter,
  recordFilingRecord,
  recordLegalStatus,
  recordNamedPeople,
  recordPolicyRegister,
  recordRecordsRequest,
} from '../../src/data/record-registers';

/*
 * These assertions are about the two things the institutional registers can get
 * wrong in a way that is invisible on the page: a row that quietly over-claims,
 * and a rule the copy states that the data no longer obeys. Both are checked
 * against the module the pages import, and the pages themselves are checked
 * separately at the bottom.
 */

/**
 * The values retracted in June 2026, derived from the commit that introduced
 * them rather than written here. This file must not contain the identifier any
 * more than the site does.
 */
function retractedIdentifierTokens(): string[] {
  const diff = execFileSync('git', ['show', '3337b68'], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024 });
  const tokens = new Set<string>();
  for (const line of diff.split('\n')) {
    if (!line.startsWith('+')) continue;
    for (const match of line.matchAll(/\bUEI\s+([A-Z0-9]{5,20})\b/g)) tokens.add(match[1]);
    for (const match of line.matchAll(/\bCAGE\s+([A-Z0-9]{4,10})\b/g)) tokens.add(match[1]);
  }
  return [...tokens];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SHA = /^[0-9a-f]{40}$/;

test('every correction entry is dated, sourced and cited by a full commit SHA', () => {
  expect(recordCorrections.length, 'the corrections register is empty').toBeGreaterThan(0);

  const ids = new Set<string>();
  for (const correction of recordCorrections) {
    expect(ids.has(correction.id), `duplicate correction id ${correction.id}`).toBe(false);
    ids.add(correction.id);

    // A publication date the repository cannot establish is published as an
    // absence. It may not be a plausible-looking guess.
    if (correction.publishedAt !== null) expect(correction.publishedAt, `${correction.id} publication date`).toMatch(ISO_DATE);
    expect(correction.correctedAt, `${correction.id} correction date`).toMatch(ISO_DATE);

    for (const field of ['subject', 'published', 'defect', 'correction', 'scope'] as const) {
      expect(correction[field].trim().length, `${correction.id} has an empty ${field}`).toBeGreaterThan(20);
    }

    expect(correction.commits.length, `${correction.id} cites no commit`).toBeGreaterThan(0);
    for (const commit of correction.commits) {
      expect(commit.sha, `${correction.id} cites an abbreviated SHA`).toMatch(SHA);
      expect(commit.committedAt, `${correction.id} commit date`).toMatch(ISO_DATE);
      expect(commit.summary.trim().length, `${correction.id} commit summary`).toBeGreaterThan(10);
      // A locator is either a resolvable link or an honest SHA. A link to a
      // commit the mirror does not have yet would be worse than the SHA.
      const locator = correctionCommitLocator(commit);
      if (commit.mirrorState === 'public') {
        expect(locator, `${commit.sha.slice(0, 7)} is marked public but has no locator`).toMatch(/^https:\/\/github\.com\//);
        expect(locator).toContain(commit.sha);
      } else {
        expect(locator, `${commit.sha.slice(0, 7)} is not on the mirror and must not be linked`).toBeNull();
      }
    }
  }
});

test('no correction entry reproduces a retracted federal identifier', () => {
  const tokens = retractedIdentifierTokens();
  expect(tokens.length, 'the retraction commit yielded no identifiers to check against').toBeGreaterThan(0);

  const prose = recordCorrections.flatMap((correction) => [
    correction.subject, correction.published, correction.defect, correction.correction, correction.scope,
    ...correction.commits.flatMap((commit) => [commit.sha, commit.summary]),
  ]);
  for (const value of prose) {
    for (const token of tokens) {
      expect(value, 'the corrections register reproduces a retracted identifier value').not.toContain(token);
    }
  }

  // The one entry that retracts identifiers must also say, on the page, that it
  // is withholding them; the flag and the copy have to agree.
  const withholding = recordCorrections.filter((correction) => correction.withholdsRetractedIdentifiers);
  expect(withholding.length, 'no entry is flagged as withholding retracted identifiers').toBeGreaterThan(0);
  for (const correction of withholding) {
    expect(correction.correction).toMatch(/not reproduce|does not reproduce/);
  }
});

test('the legal register carries each field with a basis and a limit, and states the filing gap as open', () => {
  expect(recordLegalStatus.length).toBeGreaterThan(0);
  for (const row of recordLegalStatus) {
    expect(row.field.trim(), 'a legal row has no field label').not.toBe('');
    expect(row.value.trim(), `legal row "${row.field}" has no value`).not.toBe('');
    // The basis and the limit are the substance. A row that carries a value
    // without them is a claim wearing a table's clothes.
    expect(row.basis.trim().length, `legal row "${row.field}" has no basis`).toBeGreaterThan(20);
    expect(row.limits.trim().length, `legal row "${row.field}" has no limit`).toBeGreaterThan(20);
  }

  const byField = (needle: RegExp) => recordLegalStatus.find((row) => needle.test(row.field));
  expect(byField(/identification number/i)?.value, 'the EIN is missing or malformed').toMatch(/^\d{2}-\d{7}$/);
  // The classification was wrong on this site until June 2026. The register has
  // to carry the corrected subsection, not a general "nonprofit" claim.
  const classification = byField(/classification/i);
  expect(classification?.value, 'the public-charity classification is missing').toContain('170(b)(1)(A)(vi)');
  expect(classification?.value.toLowerCase(), 'the classification still names a private foundation').not.toContain('private foundation');
  expect(byField(/ruling effective date/i)?.value, 'the ruling effective date is missing').toContain('2020');
  expect(byField(/registration id/i)?.value, 'the state registration identifier is missing').toContain('12174620');

  // The served letter is the evidence for the classification. Its summary and
  // its confirmation list have to say so, or the row above has no locator.
  expect(recordDeterminationLetter.path).toMatch(/^\/docs\/.*\.pdf$/);
  expect(recordDeterminationLetter.confirms.join(' '), 'the letter does not confirm the classification it is cited for').toContain('170(b)(1)(A)(vi)');

  // §6104(d): the obligation, the route, and the address — and no invented
  // contact channel to go with them.
  expect(recordRecordsRequest.statutoryBasis).toContain('6104(d)');
  expect(recordRecordsRequest.obligation.length).toBeGreaterThan(80);
  expect(recordRecordsRequest.addressLines.join(' '), 'the records-request address does not use the verified principal address').toContain('125 Frederick St');
  const requestCopy = [recordRecordsRequest.obligation, recordRecordsRequest.route, ...recordRecordsRequest.notAvailable].join(' ');
  expect(requestCopy, 'a post-office box was invented for records requests').not.toMatch(/P\.?O\.? Box/i);
  expect(requestCopy, 'an email address was invented for records requests').not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);

  // The filing record. The whole point of this passage is that it refuses to
  // turn an absent row in a bulk file into a finding about the institution, so
  // the refusal is asserted rather than trusted.
  expect(recordFilingRecord.whatTheDatasetShows.length).toBeGreaterThan(40);
  expect(recordFilingRecord.whatItDoesNotEstablish, 'the filing record does not draw the gap/failure distinction').toMatch(/not the same claim/i);
  expect(recordFilingRecord.whatItDoesNotEstablish, 'the filing record does not state its refusal').toMatch(/nothing on this page asserts|does not assert/i);
  expect(recordFilingRecord.unresolved, 'the filing record does not record the gap as unresolved').toMatch(/unresolved/i);
  expect(recordFilingRecord.revocationStatus, 'revocation status is stated without attributing it').toMatch(/institution reports|institution’s check|institution's check/i);

  // The claim this passage exists to prevent: that INSTAR Lab failed to file.
  //
  // A plain substring guard cannot do this job, because the passage has to be
  // able to *name* the claim in order to refuse it — "Nothing on this page
  // asserts that INSTAR Lab failed to file" is the sentence doing the work, and
  // it contains the forbidden phrase verbatim. So the rule is scoped to the
  // sentence: a non-filing phrase may appear only inside a sentence that
  // actually refuses it.
  const filingCopy = [
    recordFilingRecord.whatTheDatasetShows,
    recordFilingRecord.whatItDoesNotEstablish,
    recordFilingRecord.revocationStatus,
    recordFilingRecord.revocationRule,
    recordFilingRecord.unresolved,
    recordFilingRecord.limits,
  ].join(' ');
  const refusal = /\bnothing\b|\bdoes not (?:assert|claim|establish|say)\b|\bno (?:page|source|record) (?:asserts|claims|states)\b/i;
  const nonFilingSentence = /\b(?:did not|has not|has never|failed to|never)\s+fil(?:e|ed|ing)\b/i;
  const sentences = filingCopy.split(/(?<=\.)\s+/).filter((sentence) => nonFilingSentence.test(sentence));
  for (const sentence of sentences) {
    expect(sentence, 'the filing record asserts a filing gap instead of refusing to draw one').toMatch(refusal);
  }
});

test('the board register publishes the unaccounted seat instead of filling it', () => {
  expect(recordBoardSeats.length, 'the board register does not carry the three seats the state filing reports').toBe(3);

  const unnamed = recordBoardSeats.filter((seat) => seat.name === null);
  expect(unnamed.length, 'no seat is published empty, so the table reads as complete').toBeGreaterThan(0);
  for (const seat of unnamed) {
    expect(seat.status, 'an unaccounted seat is not marked not-reported').toBe('not-reported');
    expect(seat.basis.length).toBeGreaterThan(20);
  }

  // A name on a public page is not an appointment. Nothing here may be carried
  // as if a source had established it.
  for (const seat of recordBoardSeats) {
    expect(['site-published', 'not-reported'], `seat ${seat.seat} is over-claimed`).toContain(seat.status);
    expect(seat.limits.trim().length, `seat ${seat.seat} carries no limit`).toBeGreaterThan(20);
  }
});

test('the policy register names every expected policy and keeps the absences explicit', () => {
  const required = [/conflict of interest/i, /document retention/i, /whistleblower/i, /gift acceptance/i, /financial controls/i];
  const names = recordPolicyRegister.map((row) => row.field);
  for (const policy of required) {
    expect(names.some((name) => policy.test(name)), `the policy register omits ${policy}`).toBe(true);
  }

  const notReported = recordPolicyRegister.filter((row) => row.status === 'not-reported');
  expect(notReported.length, 'no policy is published as an explicit absence').toBeGreaterThan(0);

  for (const row of recordPolicyRegister) {
    // Every row frames itself as a publication question, not as a finding about
    // the institution. A row that says a policy is missing is the failure this
    // register exists to avoid.
    expect(row.limits, `${row.field} does not frame its absence as a publication question`).toMatch(/absence|not published/i);
    expect(row.limits, `${row.field} states its absence as a report about scope`).toMatch(/not evidence|not of a policy|not of a control|not published on this site/i);
    // The value and the status have to agree about which of the two a reader is
    // looking at, or the badge contradicts the sentence next to it.
    if (row.status === 'not-reported') {
      expect(row.value, `${row.field} is marked not-reported but does not publish the absence`).toMatch(/not yet published/i);
    } else {
      expect(row.value, `${row.field} is carried by an external record but reads as an absence`).not.toMatch(/not yet published/i);
    }
  }
});

test('the affiliation register carries every named partner at its real verification status', () => {
  expect(recordConsortiumAffiliations.length, 'the register does not carry the seven organizations the site names').toBe(7);

  const confirmed = recordConsortiumAffiliations.filter((affiliation) => affiliation.status === 'owner-confirmed');
  expect(confirmed.map((affiliation) => affiliation.organization), 'the owner-confirmed affiliation is not the one the owner confirmed').toEqual(['Ravonics LLC']);
  for (const affiliation of recordConsortiumAffiliations) {
    expect(['owner-confirmed', 'unverified'], `${affiliation.organization} is claimed more strongly than the evidence`).toContain(affiliation.status);
    expect(affiliation.limits.trim().length, `${affiliation.organization} carries no limit`).toBeGreaterThan(40);
    // The mark's provenance is a separate question from the relationship and
    // every partner mark in the media policy is unverified.
    expect(affiliation.markProvenance, `${affiliation.organization} claims a mark provenance the media policy does not record`).toBe('unverified');
  }

  // The count is the site's, not a sourced fact.
  expect(recordConsortiumClaim.statement).toMatch(/\bseven\b/i);
  expect(recordConsortiumClaim.status, 'the consortium count is published as verified').toBe('site-published');
  expect(recordConsortiumClaim.limits, 'the consortium count carries no limit').toMatch(/no source/i);
});

test('the named-people register does not carry an unevidenced credential', () => {
  expect(recordNamedPeople.length, 'the register does not carry the four people the homepage presents').toBe(4);
  for (const person of recordNamedPeople) {
    expect(person.status, `${person.name} is published as established`).toBe('unverified');
    expect(person.limits.trim().length, `${person.name} carries no limit`).toBeGreaterThan(20);
  }

  const everything = recordNamedPeople.flatMap((person) => [person.name, person.displayedRole, person.basis, person.limits]).join(' ');
  // The homepage renders a doctoral honorific on one entry. Nothing establishes
  // a doctorate, so the register must not reproduce the title.
  expect(everything, 'the register reproduces an unevidenced doctoral title').not.toMatch(/\bDr\.\s?[A-Z]/);
  expect(everything, 'the register never records that an honorific is withheld').toMatch(/doctoral honorific/i);
});

// ---------------------------------------------------------------------------
// The served pages. The data above is what the pages import; these assertions
// are about what a reader and a crawler actually receive.
// ---------------------------------------------------------------------------

test('the corrections page cites commits in prose and keeps them out of structured data', async ({ page, request }) => {
  const response = await page.goto('/record/corrections/');
  expect(response?.status()).toBe(200);

  const shas = await page.locator('main code').evaluateAll((nodes) =>
    nodes.map((node) => node.textContent ?? '').filter((text) => /^[0-9a-f]{40}$/.test(text)),
  );
  const cited = [...new Set(shas)];
  expect(cited.length, 'the corrections page cites no commit SHA').toBeGreaterThan(0);
  expect(cited.length, 'the corrections page cites fewer commits than the register carries')
    .toBeGreaterThanOrEqual(new Set(recordCorrections.flatMap((correction) => correction.commits.map((commit) => commit.sha))).size);

  // Every citation that is a link must point at that commit's own page.
  const links = await page.locator('main a[href*="/commit/"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href') ?? ''));
  for (const href of links) {
    const sha = href.split('/commit/')[1] ?? '';
    expect(cited, `a commit link points at ${sha.slice(0, 7)}…, which the page does not cite`).toContain(sha);
  }
  expect(links.length, 'no commit citation is a link, so no correction can be checked from the page').toBeGreaterThan(0);

  const html = await (await request.get('/record/corrections/')).text();
  const jsonLd = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]).join(' ');
  expect(jsonLd.length, 'the corrections page emits no JSON-LD to check').toBeGreaterThan(0);

  const metaContent = [...html.matchAll(/<meta\s[^>]*content=["']([^"']*)["']/gi)].map((match) => match[1]).join(' ');

  // The sitemap is the other machine-readable surface a citation could leak
  // into, and a route description is where it would have to come from.
  const sitemapResponse = await request.get('/sitemap-0.xml');
  expect(sitemapResponse.status(), 'the sitemap is not servable').toBe(200);
  const sitemap = await sitemapResponse.text();
  expect(sitemap.length, 'the sitemap is empty').toBeGreaterThan(0);

  for (const sha of cited) {
    expect(jsonLd, 'a cited commit SHA reached the page JSON-LD').not.toContain(sha);
    expect(metaContent, 'a cited commit SHA reached a meta tag').not.toContain(sha);
    expect(sitemap, 'a cited commit SHA reached the sitemap').not.toContain(sha);
  }

  // And the page itself must not be the one place a machine can find a
  // retracted federal identifier either.
  const pageText = await page.locator('main').innerText();
  for (const token of retractedIdentifierTokens()) {
    expect(pageText, 'the corrections page published a retracted identifier value').not.toContain(token);
  }
});

test('the served registers publish the absences the data declares', async ({ page }) => {
  await page.goto('/record/governance/');
  // Scoped by the region's own accessible name rather than by table order, so
  // adding a table above it cannot silently redirect this assertion.
  const boardTable = page.locator('[aria-label="Board seats with their basis and limits"] table');
  const boardNames = await boardTable.locator('tbody tr td:nth-of-type(1)').allInnerTexts();
  expect(boardNames.length, 'the board table does not carry three seats').toBe(3);
  expect(boardNames.filter((name) => /not reported/i.test(name)).length, 'no seat is published as not reported').toBe(1);

  // `innerText` returns rendered text, and the record table renders `th` cells
  // uppercased, so the comparison is case-insensitive on purpose.
  const governanceCopy = (await page.locator('main').innerText()).toLowerCase();
  for (const policy of ['Conflict of interest', 'Document retention', 'Whistleblower', 'Gift acceptance', 'Financial controls']) {
    expect(governanceCopy, `the policy register does not render ${policy}`).toContain(policy.toLowerCase());
  }

  await page.goto('/record/affiliations/');
  const affiliationCopy = await page.locator('main').innerText();
  expect(affiliationCopy, 'the affiliation register does not carry the seven organizations').toMatch(/INSTAR Consortium unites seven/i);
  const ownerConfirmed = await page.locator('main .badge', { hasText: 'Owner confirmed' }).count();
  expect(ownerConfirmed, 'more than one affiliation is rendered as owner confirmed').toBe(1);
  // The honorific the homepage renders must not be reproduced here.
  expect(affiliationCopy, 'the affiliation register reproduces an unevidenced doctoral title').not.toMatch(/\bDr\.\s?[A-Z]/);

  await page.goto('/record/legal/');
  const legalCopy = await page.locator('main').innerText();
  expect(legalCopy, 'the legal register does not publish the EIN').toContain('85-0845517');
  expect(legalCopy, 'the legal register does not publish the §6104(d) request path').toContain('6104(d)');
  expect(legalCopy, 'the legal register does not record the filing gap as unresolved').toMatch(/unresolved/i);
  expect(await page.locator('a[href*="apps.irs.gov"]').count(), 'a session-bound IRS link was published').toBe(0);
});

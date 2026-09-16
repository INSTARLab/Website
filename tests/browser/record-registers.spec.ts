import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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
  recordResourceUse,
} from '../../src/data/record-registers';
import { siteIdentity } from '../../src/data/seo/site';

/*
 * These assertions are about the two things the institutional registers can get
 * wrong in a way that is invisible on the page: a row that quietly over-claims,
 * and a rule the copy states that the data no longer obeys. Both are checked
 * against the module the pages import, and the pages themselves are checked
 * separately at the bottom.
 */

/**
 * The withdrawn identifiers, as digests read from the same manifest the build
 * gate reads (`scripts/quality/retracted-identifiers.json`).
 *
 * This used to shell out to `git show 3337b68` and pull the plaintext values
 * out of the commit diff. Two things were wrong with that. It made the test
 * depend on a git binary and on that commit staying reachable, and it put the
 * only copy of the derivation in a second place, free to drift from the gate's.
 * The manifest is now the single source, and it carries no plaintext value, so
 * neither this file nor the site ever holds the identifier itself.
 *
 * Matching is by digest over uppercased windows, mirroring the gate, which
 * makes it strictly stronger than the string comparison it replaces: a
 * lowercased rendering, or the value embedded in a longer alphanumeric run,
 * both match here and neither would have matched a `toContain`.
 */
interface RetractedIdentifierManifest {
  entries: { sha256: string; length: number; label: string }[];
}

function retractedIdentifierDigests(): { digests: Set<string>; lengths: number[] } {
  // Resolved from the working directory rather than `import.meta.url`: the
  // package is CommonJS, so Playwright transpiles this spec to CJS and
  // `import.meta` is not available. The config resolves `dist/` the same way,
  // and Playwright is invoked from the repository root.
  const path = join(process.cwd(), 'scripts', 'quality', 'retracted-identifiers.json');
  const manifest = JSON.parse(readFileSync(path, 'utf8')) as RetractedIdentifierManifest;
  expect(
    manifest.entries.length,
    'the retracted-identifier manifest carries no digests, so this check would pass vacuously',
  ).toBeGreaterThan(0);
  return {
    digests: new Set(manifest.entries.map((entry) => entry.sha256)),
    lengths: [...new Set(manifest.entries.map((entry) => entry.length))],
  };
}

/** A description of the withdrawn identifier found in `text`, or null. */
function findRetractedIdentifier(text: string): string | null {
  const { digests, lengths } = retractedIdentifierDigests();
  for (const run of text.split(/[^A-Za-z0-9]+/)) {
    for (const length of lengths) {
      if (run.length < length) continue;
      for (let start = 0; start + length <= run.length; start += 1) {
        const digest = createHash('sha256').update(run.slice(start, start + length).toUpperCase(), 'utf8').digest('hex');
        if (digests.has(digest)) return `a value matching a retracted ${length}-character identifier digest`;
      }
    }
  }
  return null;
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
  const prose = recordCorrections.flatMap((correction) => [
    correction.subject, correction.published, correction.defect, correction.correction, correction.scope,
    ...correction.commits.flatMap((commit) => [commit.sha, commit.summary]),
  ]);
  for (const value of prose) {
    expect(
      findRetractedIdentifier(value),
      'the corrections register reproduces a retracted identifier value',
    ).toBeNull();
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

test('the resource-use register carries the funder questions and publishes its absences', () => {
  expect(recordResourceUse.length, 'the resource-use register is empty').toBeGreaterThan(0);
  for (const row of recordResourceUse) {
    expect(row.field.trim(), 'a resource-use row has no question label').not.toBe('');
    expect(row.value.trim(), `resource-use row "${row.field}" has no value`).not.toBe('');
    expect(row.basis.trim().length, `resource-use row "${row.field}" has no basis`).toBeGreaterThan(20);
    expect(row.limits.trim().length, `resource-use row "${row.field}" has no limit`).toBeGreaterThan(20);
  }

  const byField = (needle: RegExp) => recordResourceUse.find((row) => needle.test(row.field));

  // The ratio a program officer opens with is a state filing's arithmetic, not
  // the institution's own measure, and the row has to say which publisher
  // carries it.
  const programShare = byField(/program service share/i);
  expect(programShare, 'the register does not carry the program-service share').toBeDefined();
  expect(programShare?.status, 'the program-service share is claimed as the institution’s own').toBe('external-record');
  expect(programShare?.basis, 'the program-service share is not attributed to its publisher').toMatch(/Ohio Attorney General/i);

  // The approval behind this room's own numbers is the weakest basis the
  // snapshot can carry. A register that let it read as board-approved or
  // audited would launder the weakest evidence into the strongest.
  const approval = byField(/stands behind/i);
  expect(approval, 'the register does not state who approved the published measures').toBeDefined();
  expect(approval?.value, 'the approval basis is not published').toMatch(/management attestation/i);
  expect(approval?.value, 'the register upgrades the approval basis').not.toMatch(/board[- ]approved|audited/i);

  // Every expected funder type reaches the grant row, so the partition the
  // measure declares is visible rather than summarised away.
  const grants = byField(/grant awards received/i);
  expect(grants, 'the register does not carry the grant position').toBeDefined();
  for (const funderType of ['federal', 'state', 'private']) {
    expect(grants?.value, `the grant row drops the ${funderType} funder type the measure defines`).toContain(funderType);
  }

  // An absence is published as an absence. A row marked `not-reported` that
  // carried a figure — a nominal zero included — would be a measurement the
  // register cannot make.
  const absences = recordResourceUse.filter((row) => row.status === 'not-reported');
  expect(absences.length, 'nothing is published as an absence, so the register reads as complete').toBeGreaterThan(0);
  for (const row of absences) {
    expect(row.value, `${row.field} is marked not-reported but does not publish the absence`).toMatch(/not reported/i);
    expect(row.value, `${row.field} publishes a figure where it has no measurement`).not.toMatch(/\d/);
  }

  // Contributions are approved with an unavailable value. That is not the same
  // claim as "none were received", and the row may not become one.
  const contributions = byField(/contributions received/i);
  expect(contributions?.value, 'the contributions row publishes a nominal zero').toMatch(/not reported/i);
  expect(contributions?.limits, 'the contributions row asserts whether anything was received').toMatch(/does not say whether/i);

  // No contact channel is invented to make a row look answerable.
  const everything = recordResourceUse.flatMap((row) => [row.field, row.value, row.basis, row.limits]).join(' ');
  expect(everything, 'the resource-use register invents a contact channel').not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+|\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}/);
});

test('the published contact details are recorded as a single corrected value', () => {
  const contact = recordLegalStatus.find((row) => /contact details/i.test(row.field));
  expect(contact, 'the legal register does not carry the published contact details').toBeDefined();
  expect(contact?.value, 'the published email address is not recorded').toContain('info@instarlab.org');
  expect(contact?.value, 'the published telephone number is not recorded').toContain('929-229-2917');

  // A single corrected number travels with the row: every 929-numbered
  // string in the row normalizes to the corrected digits, and only one appears.
  const rowText = [contact?.value, contact?.basis, contact?.limits].join(' ');
  const rowPhones = rowText.match(/929[-.\s()]*\d{3}[-.\s]*\d{4}/g) ?? [];
  expect(rowPhones.length, 'the contact row does not carry exactly one number').toBe(1);
  expect(rowPhones[0]?.replace(/\D/g, ''), 'the contact row carries a wrong number').toBe('9292292917');
  expect(rowText, 'the contact row still records a second-number note').not.toMatch(/discrepancy|disagree|conflicting/i);

  // The value the site emits matches the corrected register value.
  expect(siteIdentity.telephone, 'the register changed the published telephone number').toBe('929-229-2917');
  expect(siteIdentity.email, 'the register changed the published email address').toBe('info@instarlab.org');
});

// The room was modelled on a for-profit defense contractor's past-performance
// area, and commercial vocabulary that survives in its own labels describes an
// institution this is not: a 501(c)(3) has no market, no business status and no
// acquisition pathway. This guards the labels a reader navigates by — the
// top-bar navigation and the document eyebrow — rather than the editorial copy, and it
// reads them from the served artifact the way a reader receives them.
test('the served record room labels describe a public charity rather than a vendor', async ({ page, request }) => {
  const forbidden = /acquisition|market profile|business status|procurement|competitor|past performance/i;
  // A 501(c)(3) has no customers, no vendors and no marketplace. The words are
  // swept across the whole rendered page rather than the labels alone, because
  // the stale copy this caught was a link in the body — `Open business status`
  // on the room's own home route, left behind when the route label changed.
  const commercialNoun = /\bcustomers?\b|\bvendors?\b|marketplace/i;

  const manifest = await (await request.get('/record/manifest.json')).json();
  expect(manifest.routeInventory.length, 'the manifest carries no route inventory').toBeGreaterThan(10);
  for (const route of manifest.routeInventory as { path: string; label: string }[]) {
    expect(route.label, `${route.path} is labelled with commercial vocabulary`).not.toMatch(forbidden);
  }

  await page.goto('/record/', { waitUntil: 'domcontentloaded' });
  const hrefs = await page.locator('.record-topbar__menu a').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('href') ?? ''),
  );
  expect(hrefs.length, 'the grouped record navigation renders no record routes').toBeGreaterThan(10);

  for (const href of hrefs) {
    await page.goto(href, { waitUntil: 'domcontentloaded' });
    const eyebrow = await page.locator('.record-document__eyebrow span').first().innerText();
    expect(eyebrow.trim(), `${href} carries a commercial eyebrow`).not.toMatch(forbidden);
    const heading = await page.locator('h1').innerText();
    expect(heading.trim(), `${href} has no page heading`).not.toBe('');

    // The body copy a reader receives, including the links the room offers.
    const body = await page.locator('main').innerText();
    expect(body, `${href} describes the institution as a business with customers or vendors`).not.toMatch(commercialNoun);
    const anchors = await page.locator('main a').allInnerTexts();
    expect(
      anchors.filter((label) => forbidden.test(label)),
      `${href} offers a link labelled with the commercial vocabulary of its own past model`,
    ).toEqual([]);
  }
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
  expect(
    findRetractedIdentifier(pageText),
    'the corrections page published a retracted identifier value',
  ).toBeNull();
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

test('the served governance page publishes the resource-use register and its absences', async ({ page }) => {
  await page.goto('/record/governance/');
  const table = page.locator('[aria-label="Resource use and measurement register with basis, status and limits"] table');
  await expect(table).toHaveCount(1);
  // Scoped by the region's own accessible name rather than by table order, so
  // adding a table above it cannot silently redirect this assertion.
  expect(
    await table.locator('tbody tr').count(),
    'the served table does not carry every row the register declares',
  ).toBe(recordResourceUse.length);

  const copy = await table.innerText();
  expect(copy, 'the served register does not publish the program-service share').toMatch(/100\.00%/);
  expect(copy, 'the served register does not publish the approval basis behind the measures').toMatch(/management attestation/i);

  // A row published as an absence must render the absence, not a blank cell.
  const declaredAbsences = recordResourceUse.filter((row) => row.status === 'not-reported').length;
  expect(
    (copy.match(/not reported/gi) ?? []).length,
    'the served register renders fewer absences than the data declares',
  ).toBeGreaterThanOrEqual(declaredAbsences);

  // The donor's statutory route is pointed at rather than restated here, so the
  // section has to link it.
  const section = page.locator('section:has(#governance-resource-title)');
  await expect(section.locator('a[href$="/record/legal/"]')).toHaveCount(1);
});

test('the served legal register publishes the corrected contact details', async ({ page }) => {
  await page.goto('/record/legal/');
  const table = page.locator('[aria-label="Legal status fields with their basis and limits"] table');
  const copy = await table.innerText();
  expect(copy, 'the served register does not publish the corrected contact details').toContain('929-229-2917');
  // Every 929-numbered string in the served table normalizes to the corrected digits.
  const servedPhones = copy.match(/929[-.\s()]*\d{3}[-.\s]*\d{4}/g) ?? [];
  expect(servedPhones.length, 'the served table carries no 929 number at all').toBeGreaterThan(0);
  for (const phone of servedPhones) {
    expect(phone.replace(/\D/g, ''), 'the served table carries a number other than the corrected one').toBe('9292292917');
  }
});

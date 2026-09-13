# Record Room BI snapshots

The public Record Room currently ships an explicit empty snapshot because no
operational funding, project, output, or partnership aggregate has been
approved for publication. Empty data renders as `Not reported`; it is not a
zero. A data owner must approve the definitions in
`src/data/record-bi/schema.json`, provide public aggregate observations, and
record the approval reference before a snapshot can be published.

## Import a JSON snapshot

JSON input is a complete snapshot matching the contract used by
`src/data/record-bi/current.json`:

```sh
node scripts/record/import-bi.mjs --input ./approved/2026-10-01.json
```

## Import a CSV snapshot

CSV input contains one observation per row. The required columns are
`metricId`, `value`, `unit`, `periodStart`, `periodEnd`, `asOf`, `dimensions`,
`unavailableReason`, `reviewOwner`, and `nextReviewDate`. `dimensions` is a
JSON object. Source and approval metadata are supplied by a JSON sidecar; row
columns with the corresponding `source*` or approval names may replace the
sidecar metadata for a specific observation. A row must supply either all or
none of the `source*` columns, and likewise all or none of the approval
columns: a partial override is rejected because it would publish a provenance
record stitched from two different sources.

The sidecar contains the snapshot fields `schemaVersion`, `snapshotId`,
`status`, `asOf`, `refreshedAt`, `source`, `approval`, and optional `note`.
Published input must use `status: "published"` and approved metadata. The
importer rejects unknown metrics, incomplete metric grain, mismatched temporal
fields, overlapping periods at the same grain, invalid periods or units,
duplicate metric / temporal-key / dimension observations, chronology
violations, missing provenance, unapproved rows, and malformed values before
writing anything. `src/data/record-bi/schema.json` is a metric registry rather
than a standalone JSON Schema; the importer and the typed publication module
enforce its contract.

```sh
node scripts/record/import-bi.mjs \
  --input ./approved/2026-10-01.csv \
  --metadata ./approved/2026-10-01.metadata.json \
  --dry-run
```

Every successful import writes a dated immutable snapshot under
`src/data/record-bi/snapshots/` and atomically updates `current.json`. Existing
dated snapshots are preserved; retrying the same snapshot is idempotent, while
a different payload with the same identity requires `--replace` for an
intentional correction. Validate with `--dry-run` before writing. Keep
raw/private source records outside this repository and commit only the approved
aggregate snapshot and its provenance metadata.

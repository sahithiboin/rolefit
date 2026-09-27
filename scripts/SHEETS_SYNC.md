# Google Sheets logging

Run `npm run sync-sheets` from the repository root. `-- --dry-run` checks Sheets
access and Firestore candidates without writing either service.

Configure these values in `backend/.env` (or the process environment):

```dotenv
GOOGLE_SHEETS_SPREADSHEET_ID=1NnSvMimPpmrqrr6AZ1Aw1ikBLXRot7cMxUh1DYrMhMk
GOOGLE_SHEETS_TAB_ID=0
```

Sheets authentication explicitly uses `backend/service-account.json` with the
Sheets OAuth scope. The Sheets API must be enabled for the credential's project,
and the spreadsheet must be shared with that service account's `client_email`
as an editor. The key file is ignored by Git; never commit keys. Firestore
continues to use the existing Application Default Credentials independently.

```sh
npm run sync-sheets -- --dry-run
npm run sync-sheets
```

Setup reference: https://cloud.google.com/docs/authentication/application-default-credentials

The script reads the default Firestore database in `FIRESTORE_PROJECT_ID` (which
must match root `.env` `VITE_FIREBASE_PROJECT_ID`), querying root `jobs` for the
fixed scout UID, `status == Saved`, and `source == JobScout`. It includes legacy
documents with no sync flag and checks the numeric match score is between 9 and
10. `Date Ingested` is the UTC date from the original `createdAt`, never today's
sync date. Highlights use the generated resume's professional summary, with the
stored match-analysis summary as fallback; no extra AI call is made.

An empty tab receives the eight requested headers. A populated tab must already
have those exact headers; unrelated data is never overwritten. Appends use
literal string cell values, so scraped formula-like text is not executed.

Each append includes an identity note in the Date Ingested cell. Keep these notes
intact: they let reruns recognize rows even if a Sheets write succeeds but the
Firestore flag update fails. No extra visible columns are added. The document
is marked `isSyncedToSheet: true` with `sheetSyncTarget` and `sheetSyncedAt` only
after a confirmed row. The job's status and `updatedAt` are not changed.

`sheetSyncPending` is written before an append. An ambiguous failure is not
retried automatically: the next run either finds the row's note and repairs the
flag, or reports pending review. If the row is definitively absent and the old
request has finished, clear that document's `sheetSyncPending` field to allow
a deliberate retry. Do not clear it merely because a request timed out.

Concurrent syncs use a five-minute Firestore lease in `jobScoutSheetSyncLocks`,
renewed before each job. Notes + pending state handle cross-service failures;
this is not a distributed transaction. Manually deleting a synced row does not
automatically re-export it. Reset the job's sync flag deliberately if needed.

The Job Scout skill runs `npm run sync-sheets` after each real ingestion run.
The standalone `npm run job-scout` command now also syncs Sheets as its final
step and reports the number appended or recovered. Dry runs read both persistent
duplicate indexes but never ingest or write to Sheets.

Checks: `npm run sync-sheets:test` and `npm run job-scout:typecheck`.

Company/title deduplication uses shared `getJobKey(company, title)` normalization
(case, punctuation, Unicode width and whitespace). The scout reads **all** jobs
for its UID, regardless of status/source, plus all Sheet rows before scraping.
Failure to read either source aborts the run before ingestion. The same company
and title across different locations intentionally counts as one role. Each
run also drops repeat keys across every board before company classification.
The sync command recognizes matching company/title rows even without identity
notes, and marks those documents synced without adding another row.

Indeed and Glassdoor use a 30-day date filter; LinkedIn/Naukri/Wellfound retain
24 hours and hiring posts retain 48 hours. Unknown posting ages are skipped.
Before ingestion, Playwright checks the application page with bounded timeouts:
404/410 or an expiration message counts as a dead link; challenges, other HTTP
errors and timeouts count as unverified and are skipped. Coverage failures are
reported in `.job-scout/last-run.json`; no challenge bypass is attempted.

Example bounded check (Firestore ADC and the Sheets key are required):

```sh
npm run job-scout -- --dry-run --sources indeed,glassdoor --max-searches 4 --max-listings 2
```

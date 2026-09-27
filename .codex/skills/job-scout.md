---
name: job-scout
description: Find fresh non-software-engineering product, program, project, PMO, and delivery roles in Canada or Hyderabad using local Playwright, then submit qualified companies to RoleFit Job Scout ingestion.
---

# RoleFit Job Scout

Run from the RoleFit repository root. The implementation is `scripts/jobScout.ts`;
filter policy is in `scripts/jobScoutCore.ts` and public source adapters are in
`scripts/jobScoutBrowser.ts`. Do not replace the browser with a cloud scraping API.

## Run

```sh
npm install
npx playwright install chromium
npm run job-scout -- --dry-run
npm run job-scout
npm run sync-sheets
```

Use `--headed` to see the local browser, `--channel chrome` for installed Chrome,
`--pages 2` to scan additional search pages, and `--max-searches N` or
`--max-listings N` for a bounded run. The default scans one page per distinct
role/location/source search, up to 20 listing links per search. It is a bounded
search, not exhaustive coverage of the internet. `--sources` accepts a comma list
of `linkedin,naukri,wellfound,linkedin-posts`.

For ingestion, start the existing FastAPI backend on port 8000 first. Use the
project's backend environment and `uvicorn main:app --port 8000` from `backend/`.
The script reads `profiles/UKiZh8nZRSbZ8RIhgu6rWc3D7Fm2.profile` with application
default credentials and uses `transformProfileForBackend` from `src/lib/api.js`.
It requires root `.env` `VITE_FIREBASE_PROJECT_ID` to match the effective backend
`FIRESTORE_PROJECT_ID`. Keep profiles and credentials out of console reports.
`--profile-json path` can supply an already transformed UserProfile instead.
Dry runs need no profile/credentials and never call ingestion.

## Selection policy

- Geography: Canada, Remote - Canada, Hyderabad, India, or Remote - India. Remote
  alone is not sufficient evidence of Canada/India eligibility.
- Roles: Technical Program Manager (TPM), Technical Product Manager, Technical
  Project Manager, AI Product Manager, Data PM / Data Product Manager, Data
  Program Manager, PMO Lead, Delivery Lead. Exclude software engineering tracks.
- Drop originating agencies before classification or ingestion: TCS / Tata
  Consultancy Services, Capgemini, Infosys, Wipro, Cognizant, HCLTech,
  Tech Mahindra, LTIMindtree, Accenture, DXC Technology, Mphasis, NTT Data.
  An agency posting for a prestigious client remains excluded.
- Listings require an observed posting timestamp within 24 hours. Public LinkedIn
  hiring posts require a timestamp within 48 hours and a linked, complete, fresh
  JD. Search-engine freshness filters are hints, not timestamp evidence. Unknown
  dates, employer identity, geography, or incomplete JDs are filtered out.
- Companies qualify by an exact curated anchor alias (Big Tech / GCC / FinTech /
  streaming), company-description evidence of owned Product/SaaS/AI/data/developer
  platforms, or explicit YC / Series A-D / top-VC backing. Generic skills and
  customer names in a JD are not company evidence. The run report records the
  qualifying text and URL. Unverified companies are filtered out.

Public pages may show login walls, CAPTCHAs, or rate limits. Report blocked
sources; do not bypass challenges or claim blocked sources returned zero jobs.
The script searches public LinkedIn content and indexed public post URLs; it
does not require access to a private LinkedIn account. Review source errors in
`.job-scout/last-run.json` before interpreting coverage.

## Ingestion and output

Send each qualified, previously unattempted listing to
`POST http://localhost:8000/api/jobs/ingest` with the fixed UID above,
transformed `userProfile`, `jobData: {title, company, location, applyUrl}`, and
`jdText`. The backend owns the 9/10 threshold and Firestore package generation.
Count a success only when the endpoint returns `success: true`, `matchScore >= 9`,
and a `jobId`; do not compute or invent fit scores in the scraper.

`.job-scout/state.json` records attempts to prevent duplicate packages. A failed
or pending attempt is not automatically retried because the backend might have
committed before a timeout. Inspect the tracker/backend before deliberately
removing that receipt to retry. A stale `.job-scout/run.lock` may be removed only
after confirming its PID is not an active scout. No recurring schedule is
created by this skill. It does not apply to jobs or message recruiters.

Print the final chain:
`Total Scraped -> Excluded (Service) -> Filtered Out (Company Class) -> Sent to Ingestion -> Successfully Ingested (>=9/10 Match)`.
Also disclose duplicate/role/location/date exclusions, ingestion errors, source
blocks, and whether this was a dry run. Never present fixture tests as a live
scrape or a dry run as successfully ingested jobs.

Validate changes with `npm run job-scout:typecheck` and `npm run job-scout:test`.


## Phase 3: Google Sheets logging (required final step)

When invoked as `/job-scout` or `$job-scout`, automatically execute
`npm run sync-sheets` after the real job ingestion run completes. Do this even
when that run produces no new successful ingestions: earlier unsynced Saved
JobScout jobs may still need logging. Report ingestion and Sheets outcomes
separately. A dry-run request must never trigger live Sheets writes; use
`npm run sync-sheets -- --dry-run` only if a Sheets preview is also requested.

`scripts/syncToSheets.ts` uses ADC or `GOOGLE_APPLICATION_CREDENTIALS` and the
configured `GOOGLE_SHEETS_SPREADSHEET_ID` / `GOOGLE_SHEETS_TAB_ID`. The current
target is spreadsheet `1NnSvMimPpmrqrr6AZ1Aw1ikBLXRot7cMxUh1DYrMhMk`, gid `0`.
It appends only Saved JobScout jobs for the existing fixed UID with a score
of at least 9/10 and marks them `isSyncedToSheet` after confirmation. Keep the
eight requested columns and the row identity notes intact. If sync fails,
report that failure; do not rerun ingestion merely to retry Sheets logging.

Read `scripts/SHEETS_SYNC.md` for credential setup or pending-append recovery.
Validate sync changes with `npm run sync-sheets:test` and
`npm run job-scout:typecheck`.

import test from 'node:test';
import assert from 'node:assert/strict';
import { SHEETS_USER_ID, HEADERS, qualifying, sheetRow, fitReason, appendRequest, syncJobs, inspectSheet, inspectSheetTab, ensureSheetTab, ensureHeaders, type SavedJob, type SyncStore } from './syncToSheets.js';

const job = (overrides = {}): SavedJob => ({ id: 'fixture-job', data: {
  userId: SHEETS_USER_ID, source: 'JobScout', status: 'Saved', title: 'TPM', company: 'Example',
  location: 'Canada', url: 'https://example.com/apply',
  createdAt: { toDate: () => new Date('2026-09-11T12:34:00Z') },
  matchAnalysis: { overall_fit_score: 9.2, summary_text: 'Strong program leadership. Good technical skills.' },
  package: { resume: '## PROFESSIONAL SUMMARY\nExperienced technical program leader. Delivered data platforms.\n## EXPERIENCE\nOther text.' },
  ...overrides,
} });

test('only exact UID, Saved JobScout jobs with numeric scores >=9 qualify', () => {
  assert.ok(qualifying(job().data));
  assert.ok(qualifying(job({ matchAnalysis: { overall_fit_score: 9 } }).data));
  for (const patch of [{ userId: 'other' }, { status: 'Applied' }, { source: 'Manual' },
    ...[8.9, 90, NaN, '9.2', null].map(score => ({ matchAnalysis: { overall_fit_score: score } }))]) {
    assert.equal(qualifying(job(patch).data), false);
  }
});

test('eight columns use ingestion date and a single existing AI summary sentence', () => {
  assert.deepEqual(sheetRow(job().data), ['2026-09-11', 'TPM', 'Example', 'Canada', '9.2 / 10',
    'https://example.com/apply', 'Experienced technical program leader.', 'Saved']);
  assert.equal(fitReason(job({ package: {} }).data), 'Strong program leadership.');
  assert.throws(() => sheetRow(job({ createdAt: null }).data), /timestamp/);
});

test('append is atomic with its identity note and treats formula-like titles as literal text', () => {
  const request = appendRequest(0, sheetRow(job({ title: '=IMPORTXML("x")' }).data), 'RoleFit JobScout: project/jobs/fixture-job');
  const cells = request.appendCells?.rows?.[0].values;
  assert.equal(cells?.length, HEADERS.length);
  assert.equal(cells?.[0].note, 'RoleFit JobScout: project/jobs/fixture-job');
  assert.deepEqual(cells?.[1].userEnteredValue, { stringValue: '=IMPORTXML("x")' });
});

function harness() {
  let state = 'new';
  let writes = 0;
  let failMark = false;
  const ids = new Set<string>();
  const store: SyncStore = {
    claim: async () => { if (state === 'pending') return 'pending'; if (state === 'synced') return 'synced'; state = 'pending'; return 'claimed'; },
    markSynced: async () => { if (failMark) throw new Error('Firestore update failed'); state = 'synced'; },
  };
  return { store, sheet: { existingIds: ids, append: async (id: string) => { writes++; ids.add(id); } },
    get writes() { return writes; }, get state() { return state; }, set failMark(value: boolean) { failMark = value; } };
}

test('legacy missing sync flag appends once; rerun uses row marker', async () => {
  const h = harness();
  assert.equal((await syncJobs([job()], h.store, h.sheet)).appended, 1);
  assert.equal(h.state, 'synced');
  assert.equal((await syncJobs([job()], h.store, h.sheet)).recovered, 1);
  assert.equal(h.writes, 1);
});

test('successful append plus failed Firestore flag recovers without a duplicate', async () => {
  const h = harness();
  h.failMark = true;
  const first = await syncJobs([job()], h.store, h.sheet);
  assert.equal(first.appended, 1);
  assert.equal(first.failed, 1);
  h.failMark = false;
  assert.equal((await syncJobs([job()], h.store, h.sheet)).recovered, 1);
  assert.equal(h.writes, 1);
});

test('uncertain append remains pending and is never automatically appended again', async () => {
  const h = harness();
  let attempts = 0;
  h.sheet.append = async () => { attempts++; throw new Error('timeout'); };
  assert.equal((await syncJobs([job()], h.store, h.sheet)).failed, 1);
  assert.equal((await syncJobs([job()], h.store, h.sheet)).pending, 1);
  assert.equal(attempts, 1);
});

test('dry run does not claim, append or mark jobs', async () => {
  const h = harness();
  const result = await syncJobs([job()], h.store, h.sheet, { dryRun: true });
  assert.equal(result.eligible, 1);
  assert.equal(h.state, 'new');
  assert.equal(h.writes, 0);
});

test('changed eligibility at claim time prevents an append', async () => {
  const h = harness();
  h.store.claim = async () => 'ineligible';
  assert.equal((await syncJobs([job()], h.store, h.sheet)).skipped, 1);
  assert.equal(h.writes, 0);
});

test('existing headers and note IDs are read without overwriting the tab', async () => {
  const api = { spreadsheets: { get: async (request: any) => request.ranges
    ? { data: { sheets: [{ data: [{ rowData: [
      { values: HEADERS.map(value => ({ userEnteredValue: { stringValue: value } })) },
      { values: [{ note: 'prefix:fixture-job' }] },
    ] }] }] } }
    : { data: { sheets: [{ properties: { sheetId: 0, title: "Scout's Jobs" } }] } },
  } };
  const result = await inspectSheet(api as any, 'sheet', 0, 'prefix:');
  assert.ok(result.existingIds.has('fixture-job'));
  assert.equal(result.empty, false);
  api.spreadsheets.get = async () => ({ data: { sheets: [{ properties: { sheetId: 0, title: 'Jobs' }, data: [{ rowData: [{ values: [{ userEnteredValue: { stringValue: 'Unrelated existing sheet' } }] }] }] }] } } as any);
  await assert.rejects(inspectSheet(api as any, 'sheet', 0, 'prefix:'), /headers differ/);
});

test('named user tabs can be discovered or created before header writes', async () => {
  const calls: any[] = [];
  const api = { spreadsheets: {
    get: async (request: any) => request.ranges
      ? { data: { sheets: [{ data: [{ rowData: [] }] }] } }
      : { data: { sheets: [{ properties: { sheetId: 11, title: 'Sahithi' } }] } },
    batchUpdate: async (request: any) => {
      calls.push(request);
      return { data: { replies: [{ addSheet: { properties: { sheetId: 22, title: request.requestBody.requests[0].addSheet.properties.title } } }] } };
    },
  } };
  const sahithi = await inspectSheetTab(api as any, 'sheet', 'Sahithi', 'prefix:');
  assert.equal(sahithi.sheetId, 11);
  assert.equal(sahithi.title, 'Sahithi');
  const missing = await ensureSheetTab(api as any, 'sheet', 'Sushmita', 'prefix:', false);
  assert.equal(missing.missing, true);
  assert.equal(calls.length, 0);
  const created = await ensureSheetTab(api as any, 'sheet', 'Sushmita', 'prefix:', true);
  assert.equal(created.sheetId, 22);
  assert.equal(created.title, 'Sushmita');
  assert.equal(calls[0].requestBody.requests[0].addSheet.properties.title, 'Sushmita');
});


test('blank tabs get all eight headers at A1; established headers are untouched', async () => {
  const calls: any[] = [];
  const api = { spreadsheets: { batchUpdate: async (request: any) => { calls.push(request); } } };
  await ensureHeaders(api as any, 'target', 0, { empty: true, legacy: false });
  const update = calls[0].requestBody.requests[0].updateCells;
  assert.deepEqual(update.start, { sheetId: 0, rowIndex: 0, columnIndex: 0 });
  assert.deepEqual(update.rows[0].values.map((cell: any) => cell.userEnteredValue.stringValue),
    ['Date Ingested', 'Job Title', 'Company', 'Location', 'Match Score', 'Apply URL', 'Key Highlights', 'Status']);
  await ensureHeaders(api as any, 'target', 0, { empty: false, legacy: false });
  assert.equal(calls.length, 1);
  await ensureHeaders(api as any, 'target', 0, { empty: false, legacy: true });
  assert.equal(calls.length, 2);
});


test('existing Sheet company/title drops a new document ID without an append', async () => {
  const h = harness();
  const result = await syncJobs([job()], h.store, { ...h.sheet, existingKeys: new Set(['example|tpm']) });
  assert.equal(result.duplicates, 1);
  assert.equal(h.writes, 0);
  assert.equal(h.state, 'synced');
});

test('two Firestore documents for the same company/title produce one Sheet row', async () => {
  const ids = new Set<string>();
  let writes = 0;
  const marked: string[] = [];
  const result = await syncJobs([job(), { ...job({ company: 'EXAMPLE', title: ' TPM ' }), id: 'second' }],
    { claim: async () => 'claimed', markSynced: async id => { marked.push(id); } },
    { existingIds: ids, append: async () => { writes++; } });
  assert.equal(writes, 1);
  assert.equal(result.duplicates, 1);
  assert.deepEqual(marked, ['fixture-job', 'second']);
});


test('uncertain append blocks another document with the same company/title', async () => {
  let attempts = 0;
  const result = await syncJobs([job(), { ...job(), id: 'second' }],
    { claim: async () => 'claimed', markSynced: async () => assert.fail('No confirmed row') },
    { existingIds: new Set(), append: async () => { attempts++; throw new Error('timeout'); } });
  assert.equal(attempts, 1);
  assert.equal(result.failed, 1);
  assert.equal(result.pending, 1);
});

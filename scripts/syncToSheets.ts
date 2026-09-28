import { getJobKey } from './jobIdentity.cjs';
import { Firestore, FieldValue, Timestamp } from '@google-cloud/firestore';
import { GoogleAuth } from 'google-auth-library';
import { sheets, type sheets_v4 } from 'googleapis/build/src/apis/sheets/index.js';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { DEFAULT_USER_ID, activeUserId, readScoutConfig } from './jobScoutConfig.js';

export const SHEETS_USER_ID = DEFAULT_USER_ID;
export const HEADERS = ['Date Ingested', 'Job Title', 'Company', 'Location', 'Match Score', 'Apply URL', 'Key Highlights', 'Status'];
type JobData = Record<string, any>;
export type SavedJob = { id: string; data: JobData };
export type SyncStore = {
  claim(id: string): Promise<'claimed' | 'synced' | 'pending' | 'ineligible'>;
  markSynced(id: string): Promise<void>;
};
export type SyncSheet = { existingIds: Set<string>; existingKeys?: Set<string>; append(id: string, row: string[]): Promise<void> };
type TabInspection = {
  sheetId: number | null;
  existingIds: Set<string>;
  existingKeys: Set<string>;
  empty: boolean;
  legacy: boolean;
  title: string;
  missing?: boolean;
};

export function qualifying(job: JobData, userId = activeUserId()): boolean {
  const score = job.matchAnalysis?.overall_fit_score;
  return job.userId === userId && job.status === 'Saved' && job.source === 'JobScout' &&
    typeof score === 'number' && Number.isFinite(score) && score >= 9 && score <= 10;
}

export function fitReason(job: JobData): string {
  const pkg = job.package || {};
  const resumeSummary = typeof pkg.resume === 'string'
    ? pkg.resume.match(/(?:^|\n)#{1,3}\s*PROFESSIONAL SUMMARY\s*\n([\s\S]*?)(?=\n#{1,3}\s|$)/i)?.[1]
    : '';
  const candidates = [pkg.fit_reason, pkg.summary, resumeSummary, job.matchAnalysis?.summary_text,
    job.matchAnalysis?.strengths?.[0]?.description];
  const source = candidates.find(text => typeof text === 'string' && text.trim());
  if (!source) return 'No fit summary available.';
  const clean = source.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_#`]/g, '').replace(/\s+/g, ' ').trim();
  const sentence = clean.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() || clean;
  if (sentence.length <= 240) return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
  return `${sentence.slice(0, 236).replace(/\s+\S*$/, '').replace(/[.,;:!?]+$/, '')}…`;
}

export function sheetRow(job: JobData): string[] {
  const raw = job.createdAt?.toDate ? job.createdAt.toDate() : job.createdAt;
  if (!(raw instanceof Date) && (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(raw))) throw new Error('Missing ingestion timestamp.');
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid ingestion timestamp.');
  for (const field of ['title', 'company', 'location', 'url']) {
    if (typeof job[field] !== 'string') throw new Error(`Missing ${field}.`);
  }
  return [date.toISOString().slice(0, 10), job.title, job.company, job.location,
    `${job.matchAnalysis.overall_fit_score} / 10`, job.url, fitReason(job), 'Saved'];
}

/** The row and its identity note are one atomic Sheets append request. */
export function appendRequest(sheetId: number, row: string[], note?: string): sheets_v4.Schema$Request {
  return { appendCells: { sheetId, fields: 'userEnteredValue,note', rows: [{ values: row.map((value, index) => ({
    // stringValue, unlike USER_ENTERED, never executes scraped text as a formula.
    userEnteredValue: { stringValue: value }, ...(index === 0 && note ? { note } : {}),
  })) }] } };
}

export async function syncJobs(jobs: SavedJob[], store: SyncStore, sheet: SyncSheet, options: {
  dryRun?: boolean; beforeJob?: () => Promise<void>; onError?: (id: string, message: string) => void;
} = {}) {
  const count = { queried: jobs.length, duplicates: 0, eligible: 0, appended: 0, recovered: 0, skipped: 0, pending: 0, failed: 0 };
  const keys = new Set(sheet.existingKeys);
  const pendingKeys = new Set<string>();
  for (const job of jobs) {
    if (!qualifying(job.data)) { count.skipped++; continue; }
    count.eligible++;
    try {
      const row = sheetRow(job.data);
      const key = getJobKey(job.data.company, job.data.title);
      if (keys.has(key) && !sheet.existingIds.has(job.id)) {
        if (!options.dryRun) { await options.beforeJob?.(); await store.markSynced(job.id); }
        count.duplicates++;
        continue;
      }
      if (pendingKeys.has(key)) { count.pending++; continue; }
      if (options.dryRun) { keys.add(key); continue; }
      await options.beforeJob?.();
      if (sheet.existingIds.has(job.id)) {
        await store.markSynced(job.id);
        keys.add(key);
        count.recovered++;
        continue;
      }
      const claim = await store.claim(job.id);
      if (claim === 'synced' || claim === 'ineligible') { count.skipped++; continue; }
      if (claim === 'pending') { pendingKeys.add(key); count.pending++; continue; }
      // Do not retry an uncertain append. A future run reconciles its note;
      // if no note exists, pending remains for deliberate review.
      pendingKeys.add(key);
      await sheet.append(job.id, row);
      sheet.existingIds.add(job.id);
      keys.add(key);
      count.appended++;
      await store.markSynced(job.id);
    } catch (error) {
      count.failed++;
      options.onError?.(job.id, error instanceof Error ? error.message : 'Sync failed');
    }
  }
  return count;
}

export async function readConfig(root = process.cwd()) {
  return readScoutConfig(root);
}

const requestOptions = { timeout: 30_000, retry: false };
export async function inspectSheet(api: sheets_v4.Sheets, spreadsheetId: string, sheetId: number, prefix: string) {
  const metadata = await api.spreadsheets.get({ spreadsheetId, fields: 'sheets(properties(sheetId,title))' }, requestOptions);
  const tab = metadata.data.sheets?.find(sheet => sheet.properties?.sheetId === sheetId)?.properties;
  if (!tab?.title) throw new Error(`Worksheet gid=${sheetId} does not exist.`);
  return inspectSheetRows(api, spreadsheetId, tab.sheetId!, tab.title, prefix);
}

async function inspectSheetRows(api: sheets_v4.Sheets, spreadsheetId: string, sheetId: number, title: string, prefix: string): Promise<TabInspection> {
  const range = `'${title.replace(/'/g, "''")}'!A:H`;
  const response = await api.spreadsheets.get({ spreadsheetId, ranges: [range], includeGridData: true,
    fields: 'sheets(data(startRow,rowData(values(userEnteredValue,formattedValue,note))))' }, requestOptions);
  const rows = response.data.sheets?.[0]?.data?.[0]?.rowData || [];
  const existingIds = new Set<string>();
  const existingKeys = new Set<string>();
  for (const row of rows) {
    const note = row.values?.[0]?.note;
    if (note?.startsWith(prefix)) existingIds.add(note.slice(prefix.length));
  }
  for (const row of rows.slice(1)) {
    const cell = (index: number) => row.values?.[index]?.formattedValue || row.values?.[index]?.userEnteredValue?.stringValue || '';
    const key = getJobKey(cell(2), cell(1));
    if (key) existingKeys.add(key);
  }
  const hasData = rows.some(row => row.values?.some(cell => cell.userEnteredValue));
  const headers = rows[0]?.values?.slice(0, 8).map(cell => cell.userEnteredValue?.stringValue || '') || [];
  const legacyHeaders = HEADERS.map((value, index) => index === 6 ? 'Key Highlights / Fit Reason' : value);
  const legacy = JSON.stringify(headers) === JSON.stringify(legacyHeaders);
  if (hasData && !legacy && JSON.stringify(headers) !== JSON.stringify(HEADERS)) throw new Error('Target tab headers differ from the expected eight columns; existing data was not changed.');
  return { sheetId, existingIds, existingKeys, empty: !hasData, legacy, title };
}

export async function inspectSheetTab(api: sheets_v4.Sheets, spreadsheetId: string, tabName: string, prefix: string): Promise<TabInspection> {
  const metadata = await api.spreadsheets.get({ spreadsheetId, fields: 'sheets(properties(sheetId,title))' }, requestOptions);
  const tab = metadata.data.sheets?.find(sheet => sheet.properties?.title === tabName)?.properties;
  if (!tab?.title || tab.sheetId === undefined || tab.sheetId === null) {
    return { sheetId: null, existingIds: new Set(), existingKeys: new Set(), empty: true, legacy: false, title: tabName, missing: true };
  }
  return inspectSheetRows(api, spreadsheetId, tab.sheetId, tab.title, prefix);
}

export async function createSheetTab(api: sheets_v4.Sheets, spreadsheetId: string, tabName: string): Promise<{ sheetId: number; title: string }> {
  const response = await api.spreadsheets.batchUpdate({ spreadsheetId, requestBody: {
    requests: [{ addSheet: { properties: { title: tabName } } }],
  } }, requestOptions);
  const properties = response.data.replies?.[0]?.addSheet?.properties;
  const sheetId = properties?.sheetId;
  const title = properties?.title || tabName;
  if (sheetId === undefined || sheetId === null) throw new Error(`Created worksheet ${tabName}, but Sheets did not return a gid.`);
  return { sheetId, title };
}

export async function ensureSheetTab(api: sheets_v4.Sheets, spreadsheetId: string, tabName: string,
  prefix: string, createMissing: boolean): Promise<TabInspection> {
  const inspected = await inspectSheetTab(api, spreadsheetId, tabName, prefix);
  if (!inspected.missing) return inspected;
  if (!createMissing) return inspected;
  const created = await createSheetTab(api, spreadsheetId, tabName);
  return { sheetId: created.sheetId, existingIds: new Set(), existingKeys: new Set(), empty: true, legacy: false, title: created.title };
}

export async function ensureHeaders(api: sheets_v4.Sheets, spreadsheetId: string, sheetId: number,
  tab: { empty: boolean; legacy: boolean }) {
  if (!tab.empty && !tab.legacy) return;
  // Explicit row-zero addressing also handles a blank tab with stray notes.
  await api.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [{ updateCells: {
    start: { sheetId, rowIndex: 0, columnIndex: 0 },
    rows: [{ values: HEADERS.map(value => ({ userEnteredValue: { stringValue: value } })) }],
    fields: 'userEnteredValue',
  } }] } }, requestOptions);
}

/** Fail closed if either persistent duplicate index cannot be read. */
export async function loadExistingJobKeys(userId = activeUserId()): Promise<Set<string>> {
  const { projectId, spreadsheetId, sheetTabName } = await readConfig();
  const db = new Firestore({ projectId });
  try {
    const api = sheets({ version: 'v4', auth: new GoogleAuth({
      keyFile: 'backend/service-account.json', scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    }) });
    const tab = await ensureSheetTab(api, spreadsheetId, sheetTabName, `RoleFit JobScout: ${projectId}/jobs/`, false);
    const snapshot = await db.collection('jobs').where('userId', '==', userId).select('company', 'title').get();
    const keys = new Set(tab.existingKeys);
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const key = getJobKey(data.company, data.title);
      if (key) keys.add(key);
    }
    return keys;
  } finally { await db.terminate(); }
}

async function acquireLock(db: Firestore, target: string) {
  const owner = randomUUID();
  const ref = db.collection('jobScoutSheetSyncLocks').doc(createHash('sha256').update(target).digest('hex'));
  const renew = async (initial = false) => db.runTransaction(async tx => {
    const data = (await tx.get(ref)).data();
    if (initial ? data?.owner && data.expiresAt?.toMillis() > Date.now() : data?.owner !== owner) throw new Error('Another Sheets sync holds the target lock.');
    tx.set(ref, { owner, expiresAt: Timestamp.fromMillis(Date.now() + 300_000) });
  });
  await renew(true);
  return {
    renew: () => renew(),
    release: () => db.runTransaction(async tx => { if ((await tx.get(ref)).data()?.owner === owner) tx.delete(ref); }),
  };
}

export async function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({ args, options: { 'dry-run': { type: 'boolean' }, help: { type: 'boolean', short: 'h' } } });
  if (values.help) {
    console.log('npm run sync-sheets -- [--dry-run]\nConfigure ACTIVE_USER_ID, GOOGLE_SHEET_ID and optional GOOGLE_SHEETS_TAB_ID in .env.local. Sheets uses backend/service-account.json; Firestore uses ADC.');
    return;
  }
  const { projectId, spreadsheetId, sheetTabName, activeUserId: userId } = await readConfig();
  try { await access(resolve('backend/service-account.json')); }
  catch { throw new Error('Missing or unreadable backend/service-account.json. Place your Sheets service-account JSON key there.'); }
  const db = new Firestore({ projectId });
  const auth = new GoogleAuth({
    keyFile: 'backend/service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const api = sheets({ version: 'v4', auth });
  const target = `${spreadsheetId}:${sheetTabName}`;
  const prefix = `RoleFit JobScout: ${projectId}/jobs/`;
  let lock: Awaited<ReturnType<typeof acquireLock>> | undefined;
  try {
    if (!values['dry-run']) lock = await acquireLock(db, target);
    const tab = await ensureSheetTab(api, spreadsheetId, sheetTabName, prefix, !values['dry-run']);
    if (tab.missing || tab.sheetId === null) {
      console.log(`${values['dry-run'] ? 'DRY RUN (no writes) ' : ''}Sheets sync: ${JSON.stringify({ queried: 0, duplicates: 0, eligible: 0, appended: 0, recovered: 0, skipped: 0, pending: 0, failed: 0 })}`);
      console.log(`Target tab "${sheetTabName}" does not exist in https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
      return { queried: 0, duplicates: 0, eligible: 0, appended: 0, recovered: 0, skipped: 0, pending: 0, failed: 0 };
    }
    // Don't query isSyncedToSheet == false: that misses all legacy documents
    // where the flag has never been written.
    const snapshot = await db.collection('jobs').where('userId', '==', userId)
      .where('status', '==', 'Saved').where('source', '==', 'JobScout').get();
    const alreadySynced = (data: JobData) => data.isSyncedToSheet === true && (!data.sheetSyncTarget || data.sheetSyncTarget === target);
    const jobs = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })).filter(job => !alreadySynced(job.data));
    if ((tab.empty || tab.legacy) && !values['dry-run']) {
      await lock!.renew();
      await ensureHeaders(api, spreadsheetId, tab.sheetId, tab);
    }
    const store: SyncStore = {
      claim: id => db.runTransaction(async tx => {
        const ref = db.collection('jobs').doc(id);
        const data = (await tx.get(ref)).data();
        if (!data || !qualifying(data, userId)) return 'ineligible';
        if (alreadySynced(data)) return 'synced';
        if (data.sheetSyncPending?.target === target) return 'pending';
        tx.update(ref, { sheetSyncPending: { target, startedAt: FieldValue.serverTimestamp() } });
        return 'claimed';
      }),
      markSynced: async id => {
        await db.collection('jobs').doc(id).update({ isSyncedToSheet: true, sheetSyncTarget: target,
          sheetSyncedAt: FieldValue.serverTimestamp(), sheetSyncPending: FieldValue.delete() });
      },
    };
    const count = await syncJobs(jobs, store, {
      existingIds: tab.existingIds, existingKeys: tab.existingKeys,
      append: async (id, row) => {
        await api.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [appendRequest(tab.sheetId!, row, prefix + id)] } }, requestOptions);
      },
    }, { dryRun: values['dry-run'], beforeJob: lock?.renew,
      onError: (id, message) => console.error(`Job ${id}: ${message}`) });
    console.log(`${values['dry-run'] ? 'DRY RUN (no writes) ' : ''}Sheets sync: ${JSON.stringify(count)}`);
    console.log(`Target: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${tab.sheetId}`);
    if (count.pending) console.error('Pending append outcomes need review. Keep identity notes intact; rerun reconciles rows already present.');
    if (count.failed || count.pending) process.exitCode = 1;
    return count;
  } finally {
    try { await lock?.release(); } finally { await db.terminate(); }
  }
}

// Works both with the requested ts-node CommonJS override and ESM test imports.
if (process.argv[1] && /(?:^|[/\\])syncToSheets\.ts$/.test(process.argv[1])) {
  main().catch(error => {
    console.error(`Sheets sync stopped: ${error.message}`);
    if (/insufficient authentication scopes/i.test(error.message)) {
      console.error('Check that backend/service-account.json is a service-account key with Sheets access. See scripts/SHEETS_SYNC.md.');
    }
    process.exitCode = 1;
  });
}

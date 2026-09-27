import { chromium } from 'playwright';
import { Firestore } from '@google-cloud/firestore';
import { parse as parseEnv } from 'dotenv';
import { mkdir, readFile, writeFile, rename, open, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { transformProfileForBackend } from '../src/lib/api.js';
import { USER_ID, getJobKey, canonicalUrl, classifyCompany, eligible, excludedCompany, newCounters, summary, type Job, type Source, type Counters } from './jobScoutCore.js';
import { searches, readPage, listingLinks, jobFromPage, hiringPostJobs, companyEvidence, createScoutContext, discoverListings, verifyApplyUrl, deadLink, SourceBlocked } from './jobScoutBrowser.js';

import { loadExistingJobKeys, main as syncToSheets } from './syncToSheets.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENDPOINT = 'http://localhost:8000/api/jobs/ingest';
type Profile = Record<string, unknown>;
type Receipt = { status: 'pending' | 'ingested' | 'below' | 'failed'; at: string; jobId?: string; matchScore?: number };
type Journal = Record<string, Receipt>;

export async function loadEnvironment(root = ROOT): Promise<string> {
  const read = async (path: string) => {
    try { return parseEnv(await readFile(path)); }
    catch (error: any) { if (error.code === 'ENOENT') return {}; throw error; }
  };
  const frontend = await read(resolve(root, '.env'));
  const backend = await read(resolve(root, 'backend/.env'));
  for (const [key, value] of Object.entries({ ...frontend, ...backend })) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
  const project = process.env.FIRESTORE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!project) throw new Error('Set FIRESTORE_PROJECT_ID and VITE_FIREBASE_PROJECT_ID to the same Firebase project.');
  if (frontend.VITE_FIREBASE_PROJECT_ID && project !== frontend.VITE_FIREBASE_PROJECT_ID) {
    throw new Error('Backend/scout project differs from root .env VITE_FIREBASE_PROJECT_ID.');
  }
  return project;
}

export function validateProfile(profile: Profile): Profile {
  if (typeof profile.full_name !== 'string' || !profile.full_name.trim()) throw new Error('Profile needs full_name.');
  for (const key of ['skills', 'experience', 'education', 'certifications', 'projects', 'awards', 'languages']) {
    if (profile[key] !== undefined && !Array.isArray(profile[key])) throw new Error(`Profile ${key} must be an array.`);
  }
  return profile;
}

export async function loadProfile(project: string, profileFile?: string): Promise<Profile> {
  if (profileFile) return validateProfile(JSON.parse(await readFile(resolve(profileFile), 'utf8')));
  const db = new Firestore({ projectId: project });
  try {
    const doc = await db.collection('profiles').doc(USER_ID).get();
    const form = doc.data()?.profile;
    if (!doc.exists || !form) throw new Error(`No profile at profiles/${USER_ID}. Save your profile in Builder first.`);
    // Reuse the exact UI mapping (including its one-year-per-experience-entry estimate).
    return validateProfile(transformProfileForBackend(form));
  } finally { await db.terminate(); }
}

export function ingestionPayload(job: Job, profile: Profile) {
  return {
    userId: USER_ID, userProfile: profile,
    jobData: { title: job.title, company: job.company, location: job.location, applyUrl: job.url },
    jdText: job.jdText,
  };
}

export async function ingest(job: Job, profile: Profile, send: typeof fetch = fetch): Promise<Receipt> {
  // No POST retries: a timeout can occur after Firestore has committed.
  const response = await send(ENDPOINT, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ingestionPayload(job, profile)), signal: AbortSignal.timeout(600_000),
  });
  if (!response.ok) throw new Error(`Ingestion HTTP ${response.status}; inspect backend logs before retrying.`);
  const result = await response.json() as Record<string, any>;
  const score = result.matchScore;
  const at = new Date().toISOString();
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 1 || score > 10) throw new Error('Invalid ingestion response score.');
  if (result.success === true && score >= 9 && typeof result.jobId === 'string' && result.jobId) {
    return { status: 'ingested', jobId: result.jobId, matchScore: score, at };
  }
  if (result.success === false && score < 9 && result.reason === 'Match score below 9/10 threshold') {
    return { status: 'below', matchScore: score, at };
  }
  throw new Error('Unexpected ingestion response; inspect tracker before retrying.');
}

export function jobKey(job: Job): string {
  return createHash('sha256').update(`${USER_ID}\n${canonicalUrl(job.url)}\n${job.jdText}`).digest('hex');
}

async function saveJson(path: string, value: unknown) {
  await writeFile(`${path}.tmp`, JSON.stringify(value, null, 2), { mode: 0o600 });
  await rename(`${path}.tmp`, path);
}

export async function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({ args, options: {
    'dry-run': { type: 'boolean', default: false }, headed: { type: 'boolean', default: false },
    pages: { type: 'string', default: '1' }, 'max-searches': { type: 'string' },
    'max-listings': { type: 'string', default: '20' }, 'delay-ms': { type: 'string', default: '1200' },
    sources: { type: 'string', default: 'linkedin,naukri,wellfound,linkedin-posts,indeed,glassdoor' },
    'profile-json': { type: 'string' }, channel: { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  } });
  if (values.help) {
    console.log('Job Scout: npm run job-scout -- [--dry-run] [--headed] [--pages 1] [--max-searches N] [--max-listings 20] [--delay-ms 1200] [--sources linkedin,naukri,wellfound,linkedin-posts,indeed,glassdoor] [--profile-json transformed-profile.json] [--channel chrome]');
    return;
  }
  const integer = (s: string | undefined, fallback: number, min = 1) => {
    const n = s === undefined ? fallback : Number(s);
    if (!Number.isSafeInteger(n) || n < min) throw new Error(`Expected integer >= ${min}: ${s}`);
    return n;
  };
  const sourceNames = values.sources!.split(',') as Source[];
  if (sourceNames.some(s => !['linkedin', 'naukri', 'wellfound', 'linkedin-posts', 'indeed', 'glassdoor'].includes(s))) throw new Error('Unknown source.');
  const plan = searches(integer(values.pages, 1)).filter(s => sourceNames.includes(s.source));
  const maxSearches = integer(values['max-searches'], plan.length);
  const maxListings = integer(values['max-listings'], 20);
  const delayMs = integer(values['delay-ms'], 1200, 250);
  const stateDir = resolve(ROOT, '.job-scout');
  await mkdir(stateDir, { recursive: true, mode: 0o700 });
  const lockPath = resolve(stateDir, 'run.lock');
  const lock = await open(lockPath, 'wx').catch(() => { throw new Error('Job Scout lock exists. Check .job-scout/run.lock PID before removing a stale lock.'); });
  await lock.writeFile(String(process.pid));
  const counters: Counters = newCounters();
  const outcomes: Record<string, unknown>[] = [];
  const sourceStatus: Record<string, unknown>[] = [];
  let browser;
  let heartbeat;
  try {
    const project = await loadEnvironment();
    // Persistent duplicate checks are required even in dry runs; no writes occur.
    const existingKeys = await loadExistingJobKeys();
    console.log(`Loaded ${existingKeys.size} existing company/title keys from Firestore and Sheets.`);
    const profile = values['dry-run'] ? null : await loadProfile(project, values['profile-json']);
    if (profile) {
      const health = await fetch('http://localhost:8000/api/health', { signal: AbortSignal.timeout(5000) });
      if (!health.ok) throw new Error('Local backend health check failed.');
      console.log(`Profile loaded from ${values['profile-json'] ? 'local file' : `profiles/${USER_ID}`} in ${project}.`);
    }
    const journalPath = resolve(stateDir, 'state.json');
    let journal: Journal = {};
    try { journal = JSON.parse(await readFile(journalPath, 'utf8')); }
    catch (error: any) { if (error.code !== 'ENOENT') throw error; }
    browser = await chromium.launch({ headless: !values.headed, channel: values.channel });
    const context = await createScoutContext(browser);
    const page = await context.newPage();
    const detail = await context.newPage();
    const blocked = new Set<string>();
    const seen = new Set<string>();
    const visitedListings = new Set<string>();
    // Progress remains visible during long Gemini calls.
    heartbeat = setInterval(() => console.log(`Progress: scraped ${counters.total}, sent ${counters.sent}, ingested ${counters.ingested}`), 45_000);
    const handle = async (job: Job) => {
      counters.total++;
      const record: Record<string, unknown> = {
        source: job.source, url: job.url, title: job.title, company: job.company,
        location: job.location, postedAt: job.postedAt, postUrl: job.postUrl, postDate: job.postDate,
      };
      outcomes.push(record);
      const identity = getJobKey(job.company, job.title);
      if (identity && (seen.has(identity) || existingKeys.has(identity))) {
        counters.duplicate++; record.outcome = 'duplicate-company-title'; return;
      }
      if (identity) seen.add(identity);
      if (excludedCompany(job.company)) { counters.service++; record.outcome = 'excluded-service'; return; }
      const rejection = eligible(job);
      if (rejection) { counters.other++; record.outcome = rejection; return; }
      const key = jobKey(job);
      record.receiptKey = key;
      // URL also deduplicates the same job discovered through posts and listings.
      if (seen.has(canonicalUrl(job.url)) || journal[key]) { counters.duplicate++; record.outcome = 'duplicate/previous attempt'; return; }
      seen.add(canonicalUrl(job.url));
      let classification = classifyCompany(job);
      if (!classification) {
        try { await companyEvidence(detail, job, delayMs); }
        catch (error) { record.evidenceError = error instanceof Error ? error.message : 'Company page unavailable'; }
        classification = classifyCompany(job);
      }
      if (!classification) { counters.companyClass++; record.outcome = 'unverified-company-class'; return; }
      const linkStatus = await verifyApplyUrl(detail, job.url);
      if (linkStatus !== 'live') {
        if (linkStatus === 'dead') counters.dead++; else counters.other++;
        record.outcome = `${linkStatus}-apply-link`; return;
      }
      counters.qualified++;
      record.classification = classification;
      if (!profile) { record.outcome = 'dry-run-qualified'; return; }
      journal[key] = { status: 'pending', at: new Date().toISOString() };
      await saveJson(journalPath, journal);
      counters.sent++;
      try {
        const receipt = await ingest(job, profile);
        journal[key] = receipt;
        Object.assign(record, receipt);
        if (receipt.status === 'ingested') counters.ingested++;
        else counters.below++;
      } catch (error) {
        counters.failed++;
        journal[key] = { status: 'failed', at: new Date().toISOString() };
        record.outcome = 'ingestion-error';
        record.error = error instanceof Error ? error.message : 'Ingestion failed';
        console.error(`${job.url}: ${record.error}`);
      }
      await saveJson(journalPath, journal);
    };
    for (const [index, search] of plan.slice(0, maxSearches).entries()) {
      const blockKey = `${search.source}:${new URL(search.url).hostname}`;
      const hasFallback = ['indeed', 'glassdoor'].includes(search.source);
      if (blocked.has(blockKey) && !hasFallback) continue;
      console.log(`[${index + 1}/${Math.min(plan.length, maxSearches)}] ${search.source}: ${search.url}`);
      try {
        const links = (await discoverListings(page, search, delayMs, {
          skipDirect: blocked.has(blockKey),
          report: event => {
            sourceStatus.push(event);
            if (event.status === 'direct-blocked') blocked.add(blockKey);
          },
        })).slice(0, maxListings);
        sourceStatus.push({ ...search, status: links.length ? 'ok' : 'no-public-links', links: links.length });
        for (const link of links) {
          const key = canonicalUrl(link.url);
          if (visitedListings.has(key)) { counters.total++; counters.duplicate++; continue; }
          visitedListings.add(key);
          const cardIdentity = getJobKey(link.company, link.title);
          if (cardIdentity && (seen.has(cardIdentity) || existingKeys.has(cardIdentity))) {
            counters.total++; counters.duplicate++;
            outcomes.push({ url: key, outcome: 'duplicate-company-title' }); continue;
          }
          // Agency cards are rejected before visiting their JD or company pages.
          if (excludedCompany(link.company)) { if (cardIdentity) seen.add(cardIdentity); counters.total++; counters.service++; outcomes.push({ url: key, company: link.company, outcome: 'excluded-service' }); continue; }
          try {
            if (search.source === 'linkedin-posts') {
              const jobs = await hiringPostJobs(detail, link, delayMs);
              if (!jobs.length) sourceStatus.push({ source: search.source, url: link.url, status: 'no-fresh-linked-JD' });
              for (const job of jobs) await handle(job);
            } else {
              const data = await readPage(detail, link.url, delayMs);
              if (deadLink(200, data.text)) { counters.total++; counters.dead++; outcomes.push({ url: link.url, outcome: 'dead-apply-link' }); continue; }
              const job = jobFromPage(data, link, search.source);
              sourceStatus.push({ source: search.source, url: link.url, status: job.jdText.length >= 200 ? 'jd-extracted' : 'incomplete-jd', jdCharacters: job.jdText.length });
              await handle(job);
            }
          } catch (error) {
            if (error instanceof Error && /^HTTP (404|410)$/.test(error.message)) { counters.total++; counters.dead++; }
            sourceStatus.push({ url: link.url, status: error instanceof SourceBlocked ? 'blocked' : 'detail-error', error: error instanceof Error ? error.message : 'Read failed' });
            if (error instanceof SourceBlocked && !hasFallback) break;
          }
        }
      } catch (error) {
        sourceStatus.push({ ...search, status: error instanceof SourceBlocked ? 'blocked' : 'search-error', error: error instanceof Error ? error.message : 'Read failed' });
        if (error instanceof SourceBlocked) blocked.add(blockKey);
      }
    }
    if (!values['dry-run']) {
      const synced = await syncToSheets([]);
      counters.synced = (synced?.appended || 0) + (synced?.recovered || 0);
    }
  } catch (error) {
    sourceStatus.push({ status: 'run-error', error: error instanceof Error ? error.message : 'Run failed' });
    throw error;
  } finally {
    if (heartbeat) clearInterval(heartbeat);
    await browser?.close();
    await saveJson(resolve(stateDir, 'last-run.json'), { at: new Date().toISOString(), dryRun: values['dry-run'], counters, sourceStatus, outcomes });
    await lock.close();
    await unlink(lockPath);
    console.log(`\n${values['dry-run'] ? 'DRY RUN — no ingestion requests\n' : ''}${summary(counters)}`);
    const problems = sourceStatus.filter(row => !['ok', 'fallback-discovered', 'jd-extracted'].includes(String(row.status)));
    if (problems.length) console.log(`Coverage limitations: ${problems.length} blocked/failed/empty pages. See sourceStatus in the report; these are not proof of zero openings.`);
    console.log('Source coverage and decisions: .job-scout/last-run.json');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(`Job Scout stopped: ${error.message}`); process.exitCode = 1; });
}

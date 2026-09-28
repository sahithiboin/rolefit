import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { classifyCompany, excludedCompany, recent, targetLocation, targetRole, eligible, getJobKey, canonicalUrl, USER_ID, ROLES, type Job } from './jobScoutCore.js';
import {
  EXTRACT_PAGE,
  MAC_CHROME_USER_AGENT,
  SourceBlocked,
  createScoutContext,
  discoverListings,
  fallbackSearches,
  jobFromPage,
  listingLinks,
  searches,
  deadLink,
  verifyApplyUrl,
  type PageData,
} from './jobScoutBrowser.js';
import { ingest, ingestionPayload, jobKey } from './jobScout.js';
import { SUSHMITA_USER_ID, rolesFromProfile } from './jobScoutConfig.js';

const now = Date.parse('2026-09-11T12:00:00Z');
const candidate = (overrides: Partial<Job> = {}): Job => ({
  source: 'linkedin', title: 'Senior Technical Program Manager', company: 'Google',
  location: 'Canada', url: 'https://www.linkedin.com/jobs/view/12345',
  jdText: 'Lead product and data platform programs. '.repeat(10),
  postedAt: '2026-09-11T08:00:00Z', companyEvidence: [], ...overrides,
});

test('agency exclusion wins even when posting advertises work for an anchor client', () => {
  for (const company of ['TCS', 'Tata Consultancy Services Canada', 'Capgemini', 'Infosys', 'Wipro', 'Cognizant', 'HCLTech', 'HCL Technologies', 'Tech Mahindra', 'LTIMindtree', 'Accenture', 'DXC Technology', 'Mphasis', 'NTT DATA', 'TCS hiring for Google']) {
    assert.equal(excludedCompany(company), true, company);
    assert.equal(classifyCompany(candidate({ company, companyEvidence: [{ url: 'https://example.com', text: 'We build a SaaS platform.' }] })), null);
  }
  assert.equal(excludedCompany('Nottcs Products'), false);
});

test('target tracks and geographies do not admit software engineering or unspecified remote', () => {
  for (const title of [...ROLES, 'Senior TPM', 'Data Product Manager']) assert.equal(targetRole(title), true, title);
  for (const title of ['Software Engineer', 'Engineering Manager', 'Product Designer', 'Sales Manager']) assert.equal(targetRole(title), false);
  for (const loc of ['Canada', 'Remote - Canada', 'Hyderabad, India', 'Remote - India', 'Toronto, Ontario']) assert.equal(targetLocation(loc), true);
  for (const loc of ['Remote', 'Remote - US', 'Bengaluru, India', 'London, UK']) assert.equal(targetLocation(loc), false);
});

test('freshness fails closed on ambiguous, future, and stale dates', () => {
  for (const date of ['3 hours ago', '23h', 'today', '2026-09-10T12:00:00Z']) assert.equal(recent(date, 24, now), true, date);
  for (const date of ['', 'recently', '1 day ago', '24 hours ago', '2 weeks ago', '2026-09-10', '2026-09-12T00:00:00Z']) assert.equal(recent(date, 24, now), false, date);
  assert.equal(recent('1 day ago', 48, now), true);
  assert.equal(recent('2 days ago', 48, now), false);
  assert.equal(eligible(candidate(), now), null);
  assert.equal(eligible(candidate({ source: 'linkedin-posts', postDate: '3 days ago' }), now), 'post age/unknown date');
});

test('company classification requires employer evidence, not JD keywords or vendor references', () => {
  assert.equal(classifyCompany(candidate())?.tier, 'Anchor Tier-1');
  assert.equal(classifyCompany(candidate({ company: 'Google Staffing Partners' })), null);
  assert.equal(classifyCompany(candidate({ company: 'Acme', jdText: 'Must have worked with Google, SaaS and YC.' })), null);
  const withText = (text: string) => candidate({ company: 'Acme', companyEvidence: [{ url: 'https://acme.example/about', text }] });
  assert.equal(classifyCompany(withText('We build a proprietary software platform.'))?.tier, 'Product / SaaS');
  assert.equal(classifyCompany(withText('We provide SaaS consulting.')), null);
  assert.equal(classifyCompany(withText('We are backed by Y Combinator.'))?.tier, 'Startup / VC');
  assert.equal(classifyCompany(withText('We raised $20 million in Series B funding.'))?.tier, 'Startup / VC');
  assert.equal(classifyCompany(withText('We are not backed by Y Combinator.')), null);
  assert.equal(classifyCompany(withText('Our customer is backed by Y Combinator.')), null);
  assert.equal(classifyCompany(withText('Acme is backed by Accel.'))?.tier, 'Startup / VC');
  assert.equal(classifyCompany(withText('Acme is a Y Combinator-backed startup.'))?.tier, 'Startup / VC');
});

test('canonical URLs remove tracking but retain job identifiers', () => {
  assert.equal(canonicalUrl('https://ca.linkedin.com/jobs/view/role-title-12345?trk=test'), candidate().url);
  assert.equal(canonicalUrl('https://example.com/jobs?id=1&utm_source=li'), 'https://example.com/jobs?id=1');
  assert.equal(jobKey(candidate()), jobKey(candidate({ url: candidate().url + '?trk=campaign' })));
  assert.notEqual(jobKey(candidate()), jobKey(candidate({ jdText: 'Updated JD' })));
});

test('ingestion payload and returned threshold are authoritative', async () => {
  const profile = { full_name: 'Fixture Candidate', skills: ['Program Management'] };
  const payload = ingestionPayload(candidate(), profile);
  assert.equal(payload.userId, USER_ID);
  assert.equal(payload.jobData.applyUrl, candidate().url);
  const send: typeof fetch = async (url, options) => {
    assert.equal(url, 'http://localhost:8000/api/jobs/ingest');
    assert.equal(options?.method, 'POST');
    assert.deepEqual(JSON.parse(options?.body as string), payload);
    return Response.json({ success: true, jobId: 'fixture-job', matchScore: 9.2 });
  };
  assert.equal((await ingest(candidate(), profile, send)).status, 'ingested');
  assert.equal((await ingest(candidate(), profile, async () => Response.json({ success: false, reason: 'Match score below 9/10 threshold', matchScore: 8.9 }))).status, 'below');
  await assert.rejects(ingest(candidate(), profile, async () => Response.json({ success: true, jobId: 'bad', matchScore: 8.9 })), /Unexpected/);
  let attempts = 0;
  await assert.rejects(ingest(candidate(), profile, async () => { attempts++; throw new Error('timeout'); }), /timeout/);
  assert.equal(attempts, 1);
});

test('active user context can switch ingestion and role matching for Sushmita', async () => {
  const profile = { full_name: 'Sushmita Allumolu' };
  assert.equal(ingestionPayload(candidate(), profile, SUSHMITA_USER_ID).userId, SUSHMITA_USER_ID);
  assert.notEqual(jobKey(candidate(), SUSHMITA_USER_ID), jobKey(candidate(), USER_ID));
  const roles = rolesFromProfile({ targetProfiles: ['Sales Excellence Manager', 'Customer Operations Lead'] }, SUSHMITA_USER_ID);
  assert.equal(targetRole('Senior Sales Excellence Manager', roles), true);
  assert.equal(targetRole('Customer Operations Lead', roles), true);
  assert.equal(targetRole('Software Engineer', roles), false);
});

test('search plan covers all requested boards and locations plus hiring posts', () => {
  const plan = searches(1);
  for (const source of ['linkedin', 'naukri', 'wellfound', 'linkedin-posts', 'indeed', 'glassdoor']) assert.ok(plan.some(search => search.source === source));
  assert.ok(plan.some(search => search.url.includes('f_WT=2')));
  assert.ok(plan.some(search => search.url.includes('hyderabad')));
  assert.ok(plan.some(search => search.url.includes('canada')));
  assert.ok(plan.some(search => search.source === 'glassdoor' && search.url.includes('glassdoor.ca')));
  assert.ok(plan.some(search => search.source === 'glassdoor' && search.url.includes('glassdoor.co.in')));
});

test('public post discovery decodes observed Bing redirects without trusting their dates', () => {
  const url = 'https://www.linkedin.com/posts/example_hiring-tpm-activity-12345';
  const links = listingLinks({ links: [{ url: `https://www.bing.com/ck/a?u=a1${Buffer.from(url).toString('base64')}`, title: 'Hiring', company: '', location: '', date: '' }] } as PageData, 'linkedin-posts');
  assert.equal(links[0].url, url);
  assert.equal(links[0].date, '');
});

test('Indeed and Glassdoor browser context uses the requested Chrome-like profile', async () => {
  let initScript = '';
  let contextOptions: Record<string, any> = {};
  const browser = {
    async newContext(options: Record<string, any>) {
      contextOptions = options;
      return {
        async addInitScript(fn: Function) {
          initScript = fn.toString();
        },
      };
    },
  };
  await createScoutContext(browser as any);
  assert.equal(contextOptions.userAgent, MAC_CHROME_USER_AGENT);
  assert.equal(contextOptions.locale, 'en-US');
  assert.deepEqual(contextOptions.extraHTTPHeaders, {
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Sec-Ch-Ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"macOS"',
  });
  assert.match(initScript, /navigator/);
  assert.match(initScript, /webdriver/);
  assert.match(initScript, /false/);
});

test('Indeed and Glassdoor 403 searches fall back through dorked search result links', async () => {
  const search = { source: 'indeed' as const, url: 'https://ca.indeed.com/jobs?q=Technical+Program+Manager&l=Canada&fromage=30' };
  assert.deepEqual(fallbackSearches(search), [
    'https://www.bing.com/search?q=site%3Aindeed.com%2Fviewjob+%22Technical+Program+Manager%22+%22Canada%22&filters=ex1%3A%22ez3%22',
    'https://www.google.com/search?q=site%3Aindeed.com%2Fviewjob+%22Technical+Program+Manager%22+%22Canada%22&tbs=qdr%3Am',
  ]);

  const destination = 'https://ca.indeed.com/viewjob?jk=abc123';
  const events: Record<string, unknown>[] = [];
  const seenUrls: string[] = [];
  const links = await discoverListings({} as any, search, 0, {
    report: event => events.push(event),
    read: async (_page, url) => {
      seenUrls.push(url);
      if (url.includes('indeed.com/jobs')) throw new SourceBlocked('HTTP 403', 403);
      return {
        links: [{ url: `https://www.google.com/url?q=${encodeURIComponent(destination)}`, title: 'Technical Program Manager', company: 'AMD', location: 'Canada', date: '3 days ago' }],
      } as PageData;
    },
  });
  assert.deepEqual(seenUrls, [search.url, ...fallbackSearches(search).slice(0, 1)]);
  assert.equal(events[0].status, 'direct-blocked');
  assert.equal(events[1].status, 'fallback-discovered');
  assert.equal(links[0].url, destination);
});

test('fallback is limited to direct 403 responses on Indeed and Glassdoor', async () => {
  const search = { source: 'glassdoor' as const, url: 'https://www.glassdoor.com/Job/jobs.htm?keyword=Technical+Product+Manager&location=Hyderabad&fromAge=30' };
  await assert.rejects(discoverListings({} as any, search, 0, {
    read: async () => { throw new SourceBlocked('HTTP 429', 429); },
  }), /HTTP 429/);
  await assert.rejects(discoverListings({} as any, { ...search, source: 'linkedin' as const }, 0, {
    read: async () => { throw new SourceBlocked('HTTP 403', 403); },
  }), /HTTP 403/);
});

test('local Playwright extracts public cards and structured JD with remote eligibility', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(`<html><head><title>Fixture public job</title>
      <script type="application/ld+json">${JSON.stringify({ '@type': 'JobPosting', title: 'Technical Program Manager', datePosted: '2026-09-11T08:00:00Z', hiringOrganization: { name: 'Google' }, jobLocationType: 'TELECOMMUTE', applicantLocationRequirements: { name: 'CA' }, description: candidate().jdText })}</script></head>
      <body><h1>Technical Program Manager</h1><li class="base-card"><a href="https://www.linkedin.com/jobs/view/12345">Technical Program Manager</a><h4 class="base-search-card__subtitle">Google</h4><span class="job-search-card__location">Remote - Canada</span><time datetime="2026-09-11">4 hours ago</time></li></body></html>`);
    const data = await page.evaluate(EXTRACT_PAGE) as PageData;
    const links = listingLinks(data, 'linkedin');
    assert.equal(links.length, 1);
    assert.equal(links[0].date, '4 hours ago');
    const job = jobFromPage(data, links[0], 'linkedin');
    assert.equal(job.company, 'Google');
    assert.equal(job.location, 'Remote / Canada');
    assert.equal(eligible(job, now), null);
  } finally { await browser.close(); }
});


test('cross-board identity ignores casing, punctuation and whitespace, but preserves distinct roles', () => {
  assert.equal(getJobKey(' AMD ', 'Technical  Program-Manager'), 'amd|technical program manager');
  assert.equal(getJobKey('AMD', 'Technical Program Manager'), getJobKey('amd', 'technical program manager'));
  assert.notEqual(getJobKey('AMD', 'Data PM'), getJobKey('AMD', 'Technical Program Manager'));
  assert.equal(getJobKey('', 'TPM'), '');
});

test('Indeed and Glassdoor allow 30 days, while existing boards retain 24 hours', () => {
  for (const source of ['indeed', 'glassdoor'] as const) {
    assert.equal(eligible(candidate({ source, postedAt: '29 days ago' }), now), null);
    assert.equal(eligible(candidate({ source, postedAt: '31 days ago' }), now), 'age/unknown date');
    assert.equal(eligible(candidate({ source, postedAt: '' }), now), 'age/unknown date');
    const plan = searches(1).filter(search => search.source === source);
    assert.ok(plan.every(search => new URL(search.url).searchParams.get(source === 'indeed' ? 'fromage' : 'fromAge') === '30'));
  }
  assert.equal(eligible(candidate({ postedAt: '2 days ago' }), now), 'age/unknown date');
});

test('new board cards and expiration checks work through local Playwright', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(`<li class="job_seen_beacon"><a href="https://ca.indeed.com/viewjob?jk=123">Technical Program Manager</a><span data-testid="company-name">AMD</span><span data-testid="text-location">Canada</span><span class="date">3 days ago</span></li>
      <li data-test="jobListing"><a href="https://www.glassdoor.com/job-listing/technical-program-manager-amd-JV.htm?jobListingId=456">Technical Program Manager</a><span data-test="employer-name">AMD</span><span data-test="emp-location">Hyderabad, India</span><span data-test="job-age">7d</span></li>`);
    const data = await page.evaluate(EXTRACT_PAGE) as PageData;
    assert.equal(listingLinks(data, 'indeed')[0].company, 'AMD');
    assert.equal(listingLinks(data, 'glassdoor')[0].location, 'Hyderabad, India');
    await page.route('https://jobs.example/**', route => {
      const path = new URL(route.request().url()).pathname;
      return route.fulfill({ status: path === '/404' ? 404 : path === '/410' ? 410 : path === '/blocked' ? 403 : 200,
        contentType: 'text/html', body: `<body>${path === '/expired' ? 'No longer accepting applications' : 'Apply now'}</body>` });
    });
    for (const path of ['404', '410', 'expired']) assert.equal(await verifyApplyUrl(page, `https://jobs.example/${path}`), 'dead');
    assert.equal(await verifyApplyUrl(page, 'https://jobs.example/live'), 'live');
    assert.equal(await verifyApplyUrl(page, 'https://jobs.example/blocked'), 'unverified');
    assert.equal(deadLink(200, 'This job has been filled'), true);
    assert.equal(deadLink(200, 'Job Expired'), true);
  } finally { await browser.close(); }
});

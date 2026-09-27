import type { Page, Browser } from 'playwright';
import { LOCATIONS, ROLES, canonicalUrl, excludedCompany, recent, type Job, type Source } from './jobScoutCore.js';

export const MAC_CHROME_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
export async function createScoutContext(browser: Browser) {
  const context = await browser.newContext({
    locale: 'en-US', userAgent: MAC_CHROME_USER_AGENT,
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Sec-Ch-Ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
      'Sec-Ch-Ua-Mobile': '?0', 'Sec-Ch-Ua-Platform': '"macOS"',
    },
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });
  return context;
}

export type Search = { source: Source; url: string };
export type Listing = { url: string; title: string; company: string; location: string; date: string };
export type PageData = {
  title: string; text: string; links: Listing[]; jobs: Record<string, any>[];
  heading: string; company: string; location: string; date: string; description: string;
  companyText: string; companyUrl: string; postDate: string;
};

// Executed inside the local browser, not via an external scraping service.
export const EXTRACT_PAGE = String.raw`(() => {
  const text = selector => document.querySelector(selector)?.textContent?.trim() || '';
  const all = selector => Array.from(document.querySelectorAll(selector));
  const jobs = [];
  const articles = [];
  const walk = value => {
    if (!value || typeof value !== 'object') return;
    const types = [].concat(value['@type'] || []);
    if (types.includes('JobPosting')) jobs.push(value);
    if (types.some(t => /Article|SocialMediaPosting/.test(t))) articles.push(value);
    Object.values(value).forEach(v => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') walk(v);
    });
  };
  all('script[type="application/ld+json"]').forEach(el => {
    try { walk(JSON.parse(el.textContent || '{}')); } catch {}
  });
  const links = all('a[href]').map(a => {
    const card = a.closest('.base-card, .jobTuple, .srp-jobtuple-wrapper, [data-test="StartupResult"], .job_seen_beacon, [data-test="jobListing"], article, li') || a.parentElement;
    const pick = selector => card?.querySelector(selector)?.textContent?.trim() || '';
    const time = card?.querySelector('time');
    return {
      url: a.href, title: a.textContent?.trim() || '',
      company: pick('.base-search-card__subtitle, .comp-name, .companyName, [data-testid="company-name"], [data-test="employer-name"], [data-test="company-name"]'),
      location: pick('.job-search-card__location, .locWdth, .location, [data-testid="text-location"], [data-test="emp-location"], [data-test="location"]'),
      // Relative text is more precise than date-only datetime attributes.
      date: time?.textContent?.trim() || time?.getAttribute('datetime') || pick('.job-post-day, .job-posted, .postedDate, .date, [data-test="job-age"]')
    };
  });
  let companyText = '';
  all('h2,h3,h4,strong').forEach(h => {
    if (/^(about (us|the company|the organization|the organisation)|company (overview|description|profile))\s*:?$/i.test(h.textContent?.trim() || '')) {
      let node = h.nextElementSibling || h.parentElement?.nextElementSibling;
      for (let i = 0; node && i < 4; i++, node = node.nextElementSibling) {
        if (/^H[1-4]$/.test(node.tagName)) break;
        companyText += '\n' + node.textContent;
      }
    }
  });
  const companyLink = document.querySelector('.topcard__org-name-link, a[data-test="company-name"], .styles_jd-header-comp-name__MvqAI a');
  const times = all('time');
  return {
    title: document.title,
    text: document.body?.innerText?.slice(0, 100000) || '', links, jobs,
    heading: text('h1, h2.jobsearch-JobInfoHeader-title, [data-test="job-title"]'),
    company: text('.topcard__org-name-link, .styles_jd-header-comp-name__MvqAI, [data-testid="inlineHeader-companyName"], [data-test="employer-name"], [data-test="company-name"]'),
    location: text('.topcard__flavor--bullet, .styles_jhc__location__W_pVs, [data-testid="job-location"], [data-test="location"]'),
    date: text('.posted-time-ago__text, .styles_jhc__jd-stats__KrId0 time') || times[0]?.getAttribute('datetime') ||
      (document.body?.innerText?.match(/\b(?:posted|reposted)\s*:?\s*(\d+\s*(?:minutes?|hours?|days?|weeks?|months?)\s+ago|today|just now)\b/i)?.[1] || ''),
    description: text('.show-more-less-html__markup, .styles_JDC__dang-inner-html__h0K4t, [data-test="job-description"], #jobDescriptionText, [data-test="description"]'),
    companyText: companyText.slice(0, 6000), companyUrl: companyLink?.href || '',
    postDate: articles[0]?.datePublished || times[0]?.getAttribute('datetime') || text('.social-details-social-counts__publish-time')
  };
})()`;

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export function searches(pages: number): Search[] {
  const plan: Search[] = [];
  // Round-robin sources/locations so a bounded run does not visit only one board.
  for (const role of ROLES) for (const location of LOCATIONS) for (let page = 0; page < pages; page++) {
    const country = location.includes('Canada') ? 'Canada' : location.startsWith('Remote') ? 'India' : 'Hyderabad, India';
    const params = new URLSearchParams({ keywords: role, location: country, f_TPR: 'r86400', start: String(page * 25) });
    if (location.startsWith('Remote')) params.set('f_WT', '2');
    plan.push({ source: 'linkedin', url: `https://www.linkedin.com/jobs/search/?${params}` });
    const naukriLocation = location.includes('Canada') ? 'canada' : location.startsWith('Remote') ? 'remote' : 'hyderabad';
    plan.push({ source: 'naukri', url: `https://www.naukri.com/${slug(role)}-jobs-in-${naukriLocation}${page ? `-${page + 1}` : ''}?jobAge=1` });
    const wellfoundLocation = location.includes('Canada') ? 'canada-startups' : location.startsWith('Remote') ? 'india' : 'hyderabad';
    plan.push({ source: 'wellfound', url: `https://wellfound.com/role/l/${slug(role)}/${wellfoundLocation}?page=${page + 1}` });
    const indeedParams = new URLSearchParams({ q: role, l: location, fromage: '30', start: String(page * 10) });
    plan.push({ source: 'indeed', url: `https://${location.includes('Canada') ? 'ca' : 'in'}.indeed.com/jobs?${indeedParams}` });
    const glassdoorParams = new URLSearchParams({ keyword: role, location, fromAge: '30', p: String(page + 1) });
    plan.push({ source: 'glassdoor', url: `https://www.glassdoor.com/Job/jobs.htm?${glassdoorParams}` });
  }
  const hiring = '("hiring Program Manager" OR "hiring TPM" OR "hiring Technical Product Manager" OR "looking for Technical Project Manager") AND ("Canada" OR "Hyderabad" OR "Remote")';
  // Public LinkedIn content search can require login; Bing discovers public post URLs too.
  plan.unshift(
    { source: 'linkedin-posts', url: `https://www.linkedin.com/search/results/content/?${new URLSearchParams({ keywords: hiring, datePosted: '"past-week"', sortBy: '"date_posted"' })}` },
    { source: 'linkedin-posts', url: `https://www.bing.com/search?${new URLSearchParams({ q: `site:linkedin.com/posts/ ${hiring}`, filters: 'ex1:"ez2"' })}` },
  );
  return [...new Map(plan.map(search => [search.url, search])).values()];
}

export function publicUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password &&
      !/^localhost$|\.local$|\.internal$|^\[|^\d+(?:\.\d+){3}$/.test(u.hostname) && u.hostname.includes('.');
  } catch { return false; }
}

export class SourceBlocked extends Error {
  constructor(message: string, readonly status?: number) { super(message); }
}
export async function readPage(page: Page, url: string, delayMs: number): Promise<PageData> {
  if (!publicUrl(url)) throw new Error('Not a public HTTP URL');
  await page.waitForTimeout(delayMs);
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  if (response && [401, 403, 429, 999].includes(response.status())) throw new SourceBlocked(`HTTP ${response.status()}`, response.status());
  if (response && response.status() >= 400) throw new Error(`HTTP ${response.status()}`);
  await page.locator('body').waitFor({ timeout: 10_000 });
  await page.waitForTimeout(1500); // Public boards render cards after the initial HTML.
  const data = await page.evaluate(EXTRACT_PAGE) as PageData;
  if (/authwall|checkpoint|\/login|\/signin/.test(page.url()) ||
      /just a moment|access denied|security verification|verify you are human|captcha|sign in to linkedin/i.test(data.title)) {
    throw new SourceBlocked('Login or browser challenge');
  }
  return data;
}

export function listingLinks(data: PageData, source: Source): Listing[] {
  const observedLinks = data.links.map(link => {
    // Bing commonly wraps observed result links. Decode only that destination;
    // the post itself must still provide its own <=48h timestamp.
    if (['linkedin-posts', 'indeed', 'glassdoor'].includes(source)) {
      try {
        const u = new URL(link.url);
        if (/^(?:www\.)?google\.com$/.test(u.hostname) && u.pathname === '/url') {
          return { ...link, url: u.searchParams.get('q') || u.searchParams.get('url') || link.url };
        }
        const encoded = u.searchParams.get('u');
        if (/(^|\.)bing\.com$/.test(u.hostname) && encoded?.startsWith('a1')) {
          return { ...link, url: Buffer.from(encoded.slice(2), 'base64').toString('utf8') };
        }
      } catch { /* Invalid links will be rejected below. */ }
    }
    return link;
  });
  return observedLinks.filter(link => {
    if (!publicUrl(link.url)) return false;
    const url = new URL(link.url);
    if (source === 'linkedin-posts') return /(^|\.)linkedin\.com$/.test(url.hostname) && /\/posts\/|\/feed\/update\//.test(url.pathname);
    if (source === 'linkedin') return /(^|\.)linkedin\.com$/.test(url.hostname) && /\/jobs\/view\//.test(url.pathname);
    if (source === 'naukri') return /(^|\.)naukri\.com$/.test(url.hostname) && /\/job-listings-/.test(url.pathname);
    if (source === 'indeed') return /(^|\.)indeed\.com$/.test(url.hostname) && /\/(?:viewjob|rc\/clk|pagead\/clk)/.test(url.pathname) && (url.searchParams.has('jk') || url.searchParams.has('vjk'));
    if (source === 'glassdoor') return /(^|\.)glassdoor\.(?:com|ca|co\.in)$/.test(url.hostname) && /\/job-listing\//i.test(url.pathname);
    return url.hostname === 'wellfound.com' && /\/jobs\/\d+/.test(url.pathname);
  }).filter((link, i, links) => links.findIndex(other => canonicalUrl(other.url) === canonicalUrl(link.url)) === i);
}

export function plainText(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}
export function jobFromPage(data: PageData, link: Listing, source: Source): Job {
  const raw = data.jobs[0] || {};
  const organization = raw.hiringOrganization || {};
  const locations = [raw.jobLocation].flat().filter(Boolean).map(place => {
    const a = place.address || {};
    const country = typeof a.addressCountry === 'object' ? a.addressCountry.name : a.addressCountry;
    return [a.addressLocality, a.addressRegion, country === 'CA' ? 'Canada' : country === 'IN' ? 'India' : country].filter(Boolean).join(', ');
  });
  if (raw.jobLocationType === 'TELECOMMUTE') {
    locations.push('Remote', ...[raw.applicantLocationRequirements].flat().filter(Boolean).map(item => item.name === 'CA' ? 'Canada' : item.name === 'IN' ? 'India' : item.name || ''));
  }
  return {
    source, title: plainText(raw.title || data.heading || link.title),
    company: organization.name || data.company || link.company,
    location: locations.filter(Boolean).join(' / ') || data.location || link.location,
    url: canonicalUrl(link.url), jdText: plainText(raw.description || data.description),
    postedAt: raw.datePosted || data.date || link.date,
    companyEvidence: [organization.description, data.companyText].filter(Boolean).map(text => ({ url: link.url, text: plainText(text) })),
    companyUrl: organization.sameAs || organization.url || data.companyUrl,
  };
}

export async function hiringPostJobs(page: Page, link: Listing, delayMs: number): Promise<Job[]> {
  const post = await readPage(page, link.url, delayMs);
  if (!recent(post.postDate || link.date, 48)) return [];
  const jobs: Job[] = [];
  // A hiring announcement is not a full JD. Follow observed job links and
  // require identified employer, full description, location, and posting date.
  const links = post.links.filter(item => /\/jobs\/|\/job-listings-|\/job\/|\/careers\//.test(item.url));
  for (const target of [...new Map(links.map(item => [item.url, item])).values()].slice(0, 10)) {
    if (!publicUrl(target.url)) continue;
    const detail = await readPage(page, target.url, delayMs);
    const job = jobFromPage(detail, target, 'linkedin-posts');
    job.postUrl = link.url;
    job.postDate = post.postDate || link.date;
    jobs.push(job);
  }
  return jobs;
}

export async function companyEvidence(page: Page, job: Job, delayMs: number): Promise<void> {
  if (!job.companyUrl || !publicUrl(job.companyUrl) || excludedCompany(job.company)) return;
  const about = await readPage(page, job.companyUrl, delayMs);
  // Only attach a linked company's page when it identifies the same employer.
  const name = job.company.toLowerCase().replace(/\s+(inc\.?|ltd\.?)$/i, '');
  if (!(about.heading + ' ' + about.title).toLowerCase().includes(name)) return;
  job.companyEvidence.push({ url: job.companyUrl, text: about.companyText || about.text.slice(0, 8000) });
}

export function deadLink(status: number, text: string): boolean {
  return [404, 410].includes(status) || /no longer accepting applications|job expired|this job has been filled/i.test(text);
}

/** A blocked or timed-out link is unverified, never assumed live. */
export async function verifyApplyUrl(page: Page, url: string): Promise<'live' | 'dead' | 'unverified'> {
  if (!publicUrl(url)) return 'unverified';
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 12_000 });
    const status = response?.status() || 0;
    if ([404, 410].includes(status)) return 'dead';
    if (!status || status >= 400) return 'unverified';
    await page.locator('body').waitFor({ timeout: 3000 });
    // Give hydrated expiration banners a short opportunity to render.
    await page.waitForTimeout(750);
    const text = await page.locator('body').innerText({ timeout: 3000 });
    if (deadLink(status, text)) return 'dead';
    if (/authwall|checkpoint|\/login|\/signin/.test(page.url()) ||
      /captcha|verify you are human|access denied|just a moment|sign in to continue/i.test(text)) return 'unverified';
    return 'live';
  } catch { return 'unverified'; }
}


export function fallbackSearches(search: Search): string[] {
  if (!['indeed', 'glassdoor'].includes(search.source)) return [];
  const params = new URL(search.url).searchParams;
  const role = params.get('q') || params.get('keyword');
  const location = params.get('l') || params.get('location');
  if (!role || !location) return [];
  const site = search.source === 'indeed' ? 'indeed.com/viewjob' : 'glassdoor.com/job-listing';
  const q = `site:${site} "${role}" "${location}"`;
  return [
    `https://www.bing.com/search?${new URLSearchParams({ q, filters: 'ex1:"ez3"' })}`,
    `https://www.google.com/search?${new URLSearchParams({ q, tbs: 'qdr:m' })}`,
  ];
}

/** Search snippets provide URLs only; actual JDs and dates must come from listings. */
export async function discoverListings(page: Page, search: Search, delayMs: number, options: {
  skipDirect?: boolean;
  report?: (event: Record<string, unknown>) => void;
  read?: typeof readPage;
} = {}): Promise<Listing[]> {
  const read = options.read || readPage;
  if (!options.skipDirect) {
    try { return listingLinks(await read(page, search.url, delayMs), search.source); }
    catch (error) {
      if (!(error instanceof SourceBlocked) || error.status !== 403 || !fallbackSearches(search).length) throw error;
      options.report?.({ source: search.source, url: search.url, status: 'direct-blocked', httpStatus: 403 });
    }
  }
  for (const url of fallbackSearches(search)) {
    try {
      const links = listingLinks(await read(page, url, delayMs), search.source);
      options.report?.({ source: search.source, url, status: links.length ? 'fallback-discovered' : 'fallback-empty', links: links.length });
      if (links.length) return links;
    } catch (error) {
      options.report?.({ source: search.source, url, status: 'fallback-failed', error: error instanceof Error ? error.message : 'Search failed' });
    }
  }
  return [];
}

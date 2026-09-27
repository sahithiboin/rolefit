export { getJobKey } from './jobIdentity.cjs';
export const USER_ID = 'UKiZh8nZRSbZ8RIhgu6rWc3D7Fm2';
export const LOCATIONS = ['Canada', 'Remote - Canada', 'Hyderabad, India', 'Remote - India'];
export const ROLES = [
  'Technical Program Manager', 'Technical Product Manager', 'Technical Project Manager',
  'AI Product Manager', 'Data PM', 'Data Program Manager', 'PMO Lead', 'Delivery Lead',
];
export type Source = 'linkedin' | 'naukri' | 'wellfound' | 'linkedin-posts' | 'indeed' | 'glassdoor';
export type Evidence = { url: string; text: string };
export type Job = {
  source: Source; title: string; company: string; location: string; url: string;
  jdText: string; postedAt: string; companyEvidence: Evidence[]; companyUrl?: string;
  postUrl?: string; postDate?: string;
};
export type Classification = { tier: 'Anchor Tier-1' | 'Product / SaaS' | 'Startup / VC'; evidence: Evidence };

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const EXCLUDED = [
  'TCS', 'Tata Consultancy Services', 'Capgemini', 'Infosys', 'Wipro', 'Cognizant',
  'HCLTech', 'HCL Tech', 'HCL Technologies', 'Tech Mahindra', 'LTIMindtree',
  'LTI Mindtree', 'Larsen Toubro Infotech', 'Accenture', 'DXC Technology',
  'Mphasis', 'NTT Data',
];
export function excludedCompany(company: string): boolean {
  const name = ` ${normalize(company)} `;
  return EXCLUDED.some(alias => name.includes(` ${normalize(alias)} `));
}

// Curated anchors from the requested universe; exact aliases avoid matching
// unrelated firms that mention a major technology vendor in their name/JD.
const ANCHORS = [
  'Google', 'Microsoft', 'Amazon', 'Amazon Web Services', 'AWS', 'Meta', 'Meta Platforms',
  'AMD', 'Advanced Micro Devices', 'JPMC', 'JPMorgan Chase', 'JPMorgan Chase & Co',
  'J P Morgan', 'Morgan Stanley', 'Goldman Sachs', 'Spotify', 'Stripe', 'Apple',
  'Netflix', 'Nvidia', 'Salesforce', 'Adobe', 'ServiceNow', 'Oracle', 'Intuit',
  'Atlassian', 'Databricks', 'Snowflake', 'Uber', 'Airbnb', 'Shopify', 'PayPal',
];
const companyKey = (s: string) => normalize(s).replace(/\b(incorporated|inc|limited|ltd|llc|pvt|private|corporation|corp|india|canada)\b/g, '').replace(/\s+/g, ' ').trim();
export function classifyCompany(job: Job): Classification | null {
  if (excludedCompany(job.company)) return null;
  if (ANCHORS.some(alias => companyKey(alias) === companyKey(job.company))) {
    return { tier: 'Anchor Tier-1', evidence: { url: job.url, text: `Hiring organization: ${job.company}` } };
  }
  // These are company descriptions, not entire JDs: using SaaS as a skill or
  // mentioning a customer/previous employer does not establish company class.
  const product = /\b(?:we|our company|[A-Z][\w.-]+)\s+(?:builds?|develops?|offers?|operates?|provides?|owns?)\s+(?:\w+[ -]){0,7}(?:proprietary (?:software|platform|product)|saas (?:platform|product|software)|software platform|ai platform|ml platform|developer (?:tools|infrastructure)|data platform)\b/i;
  const funding = /\b(?:backed by|funded by|investors? include|raised.{0,50}from)\s+(?:y combinator|sequoia|andreessen horowitz|a16z|accel|benchmark|lightspeed|index ventures)\b|\b(?:raised|closed|secured|completed)\b.{0,70}\bseries [a-d]\b|\bseries [a-d][ -]+(?:funded|backed)\b|\b(?:y combinator|YC)[ -]*(?:backed|alum|[WSF]\d{2})\b/i;
  for (const evidence of job.companyEvidence) {
    // Negated funding claims are not verification.
    const sentences = evidence.text.split(/(?<=[.!?])\s+|\n/);
    for (const text of sentences) {
      if (/\b(?:not|never|no longer|not yet)\b/i.test(text)) continue;
      // Reject third-party anecdotes: a customer backed by YC says nothing
      // about the hiring company itself.
      const sentence = normalize(text);
      const names = [normalize(job.company), companyKey(job.company)];
      if (!/^(?:we|our company)\b/.test(sentence) && !names.some(name => sentence.startsWith(`${name} `))) continue;
      if (funding.test(text)) return { tier: 'Startup / VC', evidence: { url: evidence.url, text: text.slice(0, 500) } };
      if (product.test(text)) return { tier: 'Product / SaaS', evidence: { url: evidence.url, text: text.slice(0, 500) } };
    }
  }
  return null;
}

export function targetRole(title: string): boolean {
  if (/\b(?:software|frontend|backend|full[ -]?stack|qa|test)\s+(?:engineer|developer)|\bengineering manager\b/i.test(title)) return false;
  return /\b(?:technical\s+(?:program|product|project)\s+manager|TPM|(?:AI|artificial intelligence)\s+product\s+manager|data\s+(?:PM|product manager|program manager)|PMO\s+lead|delivery\s+lead)\b/i.test(title);
}

export function targetLocation(location: string): boolean {
  if (/\b(?:canada|canadian|hyderabad)\b/i.test(location)) return true;
  // Some boards omit the country but give an unambiguous Canadian city/province.
  if (/\b(?:toronto|vancouver|montreal|montréal|ottawa|calgary|waterloo|edmonton|quebec|ontario|british columbia)\b/i.test(location)) return true;
  return /\b(?:remote|anywhere|work from home)\b/i.test(location) && /\bindia\b/i.test(location);
}

/** Conservative age: "1 day ago" may mean almost 48h; search filters alone aren't evidence. */
export function recent(date: string, hours: number, now = Date.now()): boolean {
  const text = date.trim().toLowerCase().replace(/^(?:posted\s*)+/, '').trim();
  if (!text) return false;
  if (/^(?:just now|today|posted today)$/.test(text)) return true;
  const relative = text.match(/^(?:(?:posted|reposted)\s+)?(\d+)\s*(minute|min|hour|hr|day|week|month|m|h|d|w)s?(?:\s+ago)?$/);
  if (relative) {
    const unit = relative[2];
    const scale = /^(minute|min|m)$/.test(unit) ? 1 / 60 : /^(hour|hr|h)$/.test(unit) ? 1 : /^(day|d)$/.test(unit) ? 24 : /^(week|w)$/.test(unit) ? 168 : 720;
    return (Number(relative[1]) + 1) * scale <= hours;
  }
  // Only explicit ISO dates; don't interpret arbitrary page text as a date.
  if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(date)) return false;
  const stamp = Date.parse(date);
  return Number.isFinite(stamp) && stamp <= now && now - stamp <= hours * 3_600_000;
}

export function canonicalUrl(raw: string): string {
  const url = new URL(raw);
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|trk|tracking|ref|refId|lipi)/i.test(key)) url.searchParams.delete(key);
  }
  const linkedInId = url.pathname.match(/\/jobs\/view\/(?:.*-)?(\d+)\/?$/)?.[1];
  if (url.hostname.endsWith('linkedin.com') && linkedInId) return `https://www.linkedin.com/jobs/view/${linkedInId}`;
  return url.toString();
}

export function eligible(job: Job, now = Date.now()): string | null {
  if (!targetRole(job.title)) return 'role';
  if (!targetLocation(job.location)) return 'location';
  // A linked listing must still be <=24h old even when discovered through a <=48h post.
  if (!recent(job.postedAt, ['indeed', 'glassdoor'].includes(job.source) ? 30 * 24 : 24, now)) return 'age/unknown date';
  if (job.source === 'linkedin-posts' && !recent(job.postDate || '', 48, now)) return 'post age/unknown date';
  if (!job.company || job.jdText.trim().length < 200) return 'missing company/full JD';
  return null;
}

export type Counters = {
  total: number; service: number; companyClass: number; other: number;
  dead: number; synced: number; duplicate: number; qualified: number; sent: number; ingested: number; below: number; failed: number;
};
export const newCounters = (): Counters => ({ dead: 0, synced: 0, total: 0, service: 0, companyClass: 0, other: 0, duplicate: 0, qualified: 0, sent: 0, ingested: 0, below: 0, failed: 0 });
export function summary(c: Counters): string {
  return `Total Scraped: ${c.total} → Duplicates Dropped: ${c.duplicate} → Service Firms Dropped: ${c.service} → Dead Links Dropped: ${c.dead} → Sent to Ingestion: ${c.sent} → Ingested (≥9/10): ${c.ingested} → Synced to Sheets: ${c.synced}\nCompany class filtered: ${c.companyClass} | Other filters/unverified links: ${c.other} | Qualified: ${c.qualified} | Below 9/10: ${c.below} | Ingestion errors: ${c.failed}`;
}

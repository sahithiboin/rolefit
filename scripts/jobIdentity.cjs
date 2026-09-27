/** Shared by the ESM scout and the ts-node CommonJS Sheets command. */
function getJobKey(company, title) {
  const normalize = value => String(value ?? '').normalize('NFKC').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
  const employer = normalize(company);
  const role = normalize(title);
  return employer && role ? `${employer}|${role}` : '';
}
module.exports = { getJobKey };

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createScoutContext } from './jobScoutBrowser.js';
import { readScoutConfig } from './jobScoutConfig.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export async function main() {
  const config = await readScoutConfig(ROOT);
  await mkdir(dirname(config.linkedinStatePath), { recursive: true, mode: 0o700 });
  const browser = await chromium.launch({ headless: false, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
  try {
    const context = await createScoutContext(browser);
    const page = await context.newPage();
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });
    console.log(`Sign in to LinkedIn in the browser window. Saving session for ${config.activeUserId} to ${config.linkedinStatePath}.`);
    await page.waitForURL(url => !/\/login|\/checkpoint|\/uas\/login/.test(url.pathname), { timeout: 180_000 });
    await page.waitForTimeout(2000);
    await context.storageState({ path: config.linkedinStatePath });
    console.log(`LinkedIn session saved: ${config.linkedinStatePath}`);
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(`LinkedIn session save stopped: ${error.message}`);
    process.exitCode = 1;
  });
}

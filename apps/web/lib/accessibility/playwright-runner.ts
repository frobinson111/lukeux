/**
 * Playwright + axe-core runner for accessibility scanning
 *
 * Uses Browserless.io for headless Chrome execution in Vercel serverless environment.
 * For local development, can use local Playwright installation.
 *
 * NOTE: Uses dynamic import to avoid Next.js bundling issues with playwright-core
 */

import type { AxePageResult, AxeViolation, AccessibilityConfig } from './types';

// Default timeout per page (25 seconds to stay within 60s API limit)
const DEFAULT_PAGE_TIMEOUT_MS = 25000;

// Browserless.io connection URL
function getBrowserlessEndpoint(): string {
  const apiKey = process.env.BROWSERLESS_API_KEY;
  const endpoint = process.env.BROWSERLESS_ENDPOINT || 'wss://chrome.browserless.io';

  if (!apiKey) {
    throw new Error('BROWSERLESS_API_KEY environment variable is required for accessibility audits');
  }

  return `${endpoint}?token=${apiKey}`;
}

/**
 * Check if we should use Browserless (production) or local Playwright (development)
 */
function shouldUseBrowserless(): boolean {
  return !!process.env.BROWSERLESS_API_KEY;
}

/**
 * Check if accessibility scanning is available
 */
export function isAccessibilityScanningAvailable(): { available: boolean; reason?: string } {
  if (!process.env.BROWSERLESS_API_KEY) {
    return {
      available: false,
      reason: 'BROWSERLESS_API_KEY is not configured. Accessibility audits require a Browserless.io account.',
    };
  }
  return { available: true };
}

/**
 * Dynamically import playwright-core to avoid Next.js bundling issues
 */
async function getPlaywright() {
  const pw = await import('playwright-core');
  return pw.chromium;
}

/**
 * Connect to browser (Browserless or local)
 */
async function connectBrowser() {
  const chromium = await getPlaywright();

  if (shouldUseBrowserless()) {
    // Connect to Browserless.io via CDP
    return chromium.connectOverCDP(getBrowserlessEndpoint());
  } else {
    // Local development: launch Chromium directly
    // Note: Requires `npx playwright install chromium` locally
    return chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
}

/**
 * Inject axe-core into the page and run analysis
 *
 * We inject axe-core dynamically because @axe-core/playwright may have issues
 * with remote browser connections. This approach is more reliable.
 */
async function runAxeOnPage(page: any): Promise<any> {
  // Inject axe-core from CDN
  await page.addScriptTag({
    url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.4/axe.min.js',
  });

  // Wait for axe to be available
  await page.waitForFunction(() => typeof (window as any).axe !== 'undefined', {
    timeout: 5000,
  });

  // Run axe analysis with WCAG 2.x AA + Section 508 tags
  const results = await page.evaluate(() => {
    return (window as any).axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'section508'],
      },
      resultTypes: ['violations', 'passes', 'incomplete', 'inapplicable'],
    });
  });

  return results;
}

/**
 * Scan a single URL for accessibility violations
 */
export async function scanPage(
  url: string,
  config?: Partial<AccessibilityConfig>
): Promise<AxePageResult> {
  const timeout = config?.timeout || DEFAULT_PAGE_TIMEOUT_MS;
  let browser: any = null;

  try {
    browser = await connectBrowser();
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 LukeUX-A11y-Audit/1.0',
    });

    const page = await context.newPage();

    // Navigate to URL
    await page.goto(url, {
      timeout,
      waitUntil: 'domcontentloaded',
    });

    // Wait a bit for dynamic content to load
    await page.waitForTimeout(1000);

    // Run axe-core analysis
    const axeResults = await runAxeOnPage(page);

    // Transform to our type structure
    const violations: AxeViolation[] = axeResults.violations.map((v: any) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      tags: v.tags,
      nodes: v.nodes.map((n: any) => ({
        html: n.html,
        target: n.target,
        failureSummary: n.failureSummary,
      })),
    }));

    await context.close();

    return {
      url,
      timestamp: new Date().toISOString(),
      violations,
      passes: axeResults.passes.map((p: any) => ({
        id: p.id,
        description: p.description,
      })),
      incomplete: axeResults.incomplete.map((i: any) => ({
        id: i.id,
        description: i.description,
      })),
      inapplicable: axeResults.inapplicable.map((i: any) => ({
        id: i.id,
        description: i.description,
      })),
    };
  } catch (error) {
    // Return error result instead of throwing
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[A11y Scan] Failed to scan ${url}:`, errorMessage);

    return {
      url,
      timestamp: new Date().toISOString(),
      violations: [],
      passes: [],
      incomplete: [],
      inapplicable: [],
    };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

/**
 * Scan multiple URLs sequentially
 *
 * Note: For MVP, we scan sequentially to stay within timeout limits.
 * Future enhancement: parallel scanning with connection pooling.
 */
export async function scanPages(
  urls: string[],
  config?: Partial<AccessibilityConfig>
): Promise<{
  results: AxePageResult[];
  successfulScans: number;
  failedScans: string[];
}> {
  const maxPages = config?.maxPages || 3;
  const urlsToScan = urls.slice(0, maxPages);

  const results: AxePageResult[] = [];
  const failedScans: string[] = [];

  for (const url of urlsToScan) {
    try {
      const result = await scanPage(url, config);

      // Check if scan was successful (has either violations or passes)
      if (result.violations.length > 0 || result.passes.length > 0) {
        results.push(result);
      } else {
        // Scan returned empty results, likely failed
        failedScans.push(url);
        results.push(result); // Still include for completeness
      }
    } catch (error) {
      console.error(`[A11y Scan] Error scanning ${url}:`, error);
      failedScans.push(url);
    }
  }

  return {
    results,
    successfulScans: results.length - failedScans.length,
    failedScans,
  };
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Parse URLs from user input (newline or comma separated)
 */
export function parseUrls(input: string): string[] {
  return input
    .split(/[\n,]+/)
    .map((url) => url.trim())
    .filter((url) => url.length > 0)
    .filter(isValidUrl);
}

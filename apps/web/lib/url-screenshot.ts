/**
 * URL Screenshot Service
 *
 * Captures a screenshot (PNG) of a URL using Browserless (when available)
 * or falls back to local Playwright.
 */

const DEFAULT_VIEWPORT = { width: 1280, height: 720 };

function getBrowserlessEndpoint(): string {
  const apiKey = process.env.BROWSERLESS_API_KEY;
  const endpoint = process.env.BROWSERLESS_ENDPOINT || "wss://chrome.browserless.io";

  if (!apiKey) {
    throw new Error("BROWSERLESS_API_KEY environment variable is required");
  }
  return `${endpoint}?token=${apiKey}`;
}

function shouldUseBrowserless(): boolean {
  return !!process.env.BROWSERLESS_API_KEY;
}

async function getChromium() {
  const pw = await import("playwright-core");
  return pw.chromium;
}

async function connectBrowser() {
  const chromium = await getChromium();
  if (shouldUseBrowserless()) {
    return chromium.connectOverCDP(getBrowserlessEndpoint());
  }

  // Local development: requires `npx playwright install chromium`
  return chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
}

export async function captureUrlScreenshot(url: string, opts?: { fullPage?: boolean }) {
  let browser: any = null;
  const fullPage = opts?.fullPage ?? false;

  try {
    browser = await connectBrowser();
    const context = await browser.newContext({
      viewport: DEFAULT_VIEWPORT,
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 LukeUX-Wireframe/1.0"
    });

    const page = await context.newPage();
    await page.goto(url, { timeout: 25000, waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    const buffer = await page.screenshot({
      type: "png",
      fullPage
    });

    await context.close();

    return {
      mimeType: "image/png" as const,
      base64Data: Buffer.from(buffer).toString("base64"),
      viewport: DEFAULT_VIEWPORT,
      method: shouldUseBrowserless() ? ("browserless" as const) : ("local" as const)
    };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

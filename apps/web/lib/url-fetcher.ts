/**
 * URL Fetcher Service
 * 
 * Fetches and extracts content from URLs using Browserless (when available)
 * or falls back to simple HTTP fetch for static sites.
 */

const MAX_CONTENT_LENGTH = 50_000; // Maximum characters to extract from URL

/**
 * Check if Browserless is available
 */
function isBrowserlessAvailable(): boolean {
  return !!process.env.BROWSERLESS_API_KEY;
}

/**
 * Get Browserless connection endpoint
 */
function getBrowserlessEndpoint(): string {
  const apiKey = process.env.BROWSERLESS_API_KEY;
  const endpoint = process.env.BROWSERLESS_ENDPOINT || 'wss://chrome.browserless.io';
  
  if (!apiKey) {
    throw new Error('BROWSERLESS_API_KEY environment variable is required');
  }
  
  return `${endpoint}?token=${apiKey}`;
}

/**
 * Extract text content from HTML
 */
function extractTextFromHtml(html: string): string {
  // Remove script and style tags
  let textContent = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ") // Remove HTML tags
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
  
  return textContent;
}

/**
 * Extract page title from HTML
 */
function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].trim();
  }
  return "Untitled Page";
}

/**
 * Fetch URL using Browserless (Playwright with headless Chrome)
 * This executes JavaScript and captures rendered content
 */
async function fetchWithBrowserless(url: string): Promise<{
  title: string;
  content: string;
  contentLength: number;
}> {
  let browser: any = null;
  
  try {
    // Dynamically import playwright-core to avoid Next.js bundling issues
    const pw = await import('playwright-core');
    const chromium = pw.chromium;
    
    // Connect to Browserless via CDP
    browser = await chromium.connectOverCDP(getBrowserlessEndpoint());
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 LukeUX-Bot/1.0',
    });
    
    const page = await context.newPage();
    
    // Navigate to URL with timeout
    await page.goto(url, {
      timeout: 25000, // 25 second timeout
      waitUntil: 'domcontentloaded',
    });
    
    // Wait a bit for dynamic content to load
    await page.waitForTimeout(2000);
    
    // Get page title
    const title = await page.title().catch(() => "Untitled Page");
    
    // Get rendered HTML
    const html = await page.content();
    
    // Extract text content
    let textContent = await page.evaluate(() => {
      // Remove script and style elements from DOM
      const scripts = document.querySelectorAll('script, style, noscript');
      scripts.forEach(el => el.remove());
      
      // Get text content from body
      return document.body?.innerText || document.body?.textContent || '';
    }).catch(() => extractTextFromHtml(html));
    
    // Clean up whitespace
    textContent = textContent.replace(/\s+/g, ' ').trim();
    
    // Truncate if too long
    if (textContent.length > MAX_CONTENT_LENGTH) {
      textContent = textContent.slice(0, MAX_CONTENT_LENGTH) + "\n...[content truncated]";
    }
    
    await context.close();
    
    return {
      title: title || extractTitle(html),
      content: textContent,
      contentLength: textContent.length,
    };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

/**
 * Fetch URL using simple HTTP fetch (fallback for static sites)
 */
async function fetchWithHttp(url: string): Promise<{
  title: string;
  content: string;
  contentLength: number;
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "LukeUX-Bot/1.0 (UX Analysis Tool)",
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get("content-type") || "";
    
    // Only process HTML content
    if (!contentType.includes("text/html")) {
      throw new Error("URL must return HTML content");
    }
    
    const html = await response.text();
    
    // Extract text content
    let textContent = extractTextFromHtml(html);
    
    // Truncate if too long
    if (textContent.length > MAX_CONTENT_LENGTH) {
      textContent = textContent.slice(0, MAX_CONTENT_LENGTH) + "\n...[content truncated]";
    }
    
    return {
      title: extractTitle(html),
      content: textContent,
      contentLength: textContent.length,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch URL content with browser rendering (preferred) or simple HTTP (fallback)
 */
export async function fetchUrlContent(url: string): Promise<{
  url: string;
  title: string;
  content: string;
  contentLength: number;
  method: 'browserless' | 'http';
}> {
  // Validate URL format
  try {
    const parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Only HTTP/HTTPS URLs are supported");
    }
  } catch (err) {
    throw new Error("Invalid URL format");
  }
  
  // Try Browserless first (better for modern sites, Figma, SPAs)
  if (isBrowserlessAvailable()) {
    try {
      console.log(`[URL Fetcher] Using Browserless to fetch: ${url}`);
      const result = await fetchWithBrowserless(url);
      return {
        url,
        ...result,
        method: 'browserless',
      };
    } catch (error) {
      console.error(`[URL Fetcher] Browserless failed, falling back to HTTP:`, error);
      // Fall through to HTTP fallback
    }
  }
  
  // Fallback to simple HTTP fetch
  console.log(`[URL Fetcher] Using HTTP fetch for: ${url}`);
  const result = await fetchWithHttp(url);
  return {
    url,
    ...result,
    method: 'http',
  };
}

/**
 * Validate if a string is a valid URL
 */
export function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

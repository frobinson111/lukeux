export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";

const MAX_CONTENT_LENGTH = 50_000; // Maximum characters to extract from URL

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => null);
    const { url } = body || {};

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL format
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return NextResponse.json({ error: "Only HTTP/HTTPS URLs are supported" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // Fetch the URL content
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
        return NextResponse.json(
          { error: `Failed to fetch URL: ${response.status} ${response.statusText}` },
          { status: 400 }
        );
      }

      const contentType = response.headers.get("content-type") || "";
      
      // Only process HTML content
      if (!contentType.includes("text/html")) {
        return NextResponse.json(
          { error: "URL must return HTML content" },
          { status: 400 }
        );
      }

      const html = await response.text();

      // Basic HTML parsing - extract text content
      // Remove script and style tags
      let textContent = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ") // Remove HTML tags
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim();

      // Truncate if too long
      if (textContent.length > MAX_CONTENT_LENGTH) {
        textContent = textContent.slice(0, MAX_CONTENT_LENGTH) + "\n...[content truncated]";
      }

      return NextResponse.json({
        url: url,
        title: extractTitle(html),
        content: textContent,
        contentLength: textContent.length,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === "AbortError") {
        return NextResponse.json({ error: "Request timeout - URL took too long to respond" }, { status: 408 });
      }
      return NextResponse.json(
        { error: `Failed to fetch URL: ${fetchError.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("URL fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch URL" },
      { status: 500 }
    );
  }
}

// Helper function to extract page title from HTML
function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].trim();
  }
  return "Untitled Page";
}

export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { fetchUrlContent, isValidUrl } from "../../../../lib/url-fetcher";

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
    if (!isValidUrl(url)) {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // Fetch the URL content using Browserless (preferred) or HTTP fallback
    try {
      const result = await fetchUrlContent(url);
      
      return NextResponse.json({
        url: result.url,
        title: result.title,
        content: result.content,
        contentLength: result.contentLength,
        method: result.method, // Include method for debugging
      });
    } catch (fetchError: any) {
      console.error("URL fetch error:", fetchError);
      
      // Handle specific error types
      if (fetchError.message?.includes("timeout")) {
        return NextResponse.json(
          { error: "Request timeout - URL took too long to respond" },
          { status: 408 }
        );
      }
      
      return NextResponse.json(
        { error: fetchError.message || "Failed to fetch URL" },
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

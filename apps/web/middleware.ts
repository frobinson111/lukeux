import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Apply no-store caching to all API responses to avoid stale data
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");

  // Lightweight API request logging for latency/error observation
  const isApi = req.nextUrl.pathname.startsWith("/api/");
  if (isApi) {
    const start = Date.now();
    res.headers.set("X-Request-Start", String(start));
    res.headers.set("X-Request-Path", req.nextUrl.pathname);
    res.headers.set("X-Request-Method", req.method);

    res.headers.set("Vary", "X-Request-Path, X-Request-Method");

    res.headers.append("X-Request-Log", JSON.stringify({
      path: req.nextUrl.pathname,
      method: req.method,
      start
    }));
  }

  return res;
}

export const config = {
  matcher: ["/api/:path*"]
};


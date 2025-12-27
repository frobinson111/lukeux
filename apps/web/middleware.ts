import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  // Apply no-store caching to all API responses to avoid stale data
  const res = NextResponse.next();
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

export const config = {
  matcher: ["/api/:path*"]
};


// middleware.ts
// Next.js middleware for rate limiting public routes
// Runs at the edge before pages are rendered

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkPublicRateLimit, getClientIp } from "@/lib/publicRateLimit";

// Routes that should be rate limited (public dashboard pages)
const PUBLIC_ROUTES = [
  "/overview",
  "/analytics", 
  "/budget",
  "/departments",
  "/revenues",
  "/transactions",
  "/vendors",
  "/download",
];

// Routes to skip (static assets, API routes handled separately, admin)
const SKIP_PATTERNS = [
  /^\/_next/,           // Next.js internals
  /^\/api\//,           // API routes (have their own rate limiting)
  /^\/admin/,           // Admin routes (require auth)
  /^\/login/,           // Login page
  /\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2)$/, // Static files
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip patterns that don't need rate limiting
  for (const pattern of SKIP_PATTERNS) {
    if (pattern.test(pathname)) {
      return NextResponse.next();
    }
  }
  
  // Check if this is a public dashboard route
  // Routes are like /sample-city/budget, /sample-city/transactions, etc.
  const pathParts = pathname.split("/").filter(Boolean);
  
  // Need at least 2 parts: [citySlug, route] or just citySlug for home
  if (pathParts.length === 0) {
    return NextResponse.next();
  }
  
  // Check if second part is a public route, or if it's just the city home page
  const isPublicRoute = pathParts.length === 1 || // City home page
    PUBLIC_ROUTES.some(route => pathname.includes(route));
  
  if (!isPublicRoute) {
    return NextResponse.next();
  }
  
  // Apply rate limiting
  const ip = getClientIp(request);
  const result = checkPublicRateLimit(ip, 100, 60 * 1000); // 100 req/min
  
  if (!result.allowed) {
    // Return 429 Too Many Requests
    return new NextResponse(
      JSON.stringify({
        error: "Too many requests. Please slow down.",
        retryAfter: result.resetInSeconds,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(result.resetInSeconds),
          "X-RateLimit-Limit": "100",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(result.resetInSeconds),
        },
      }
    );
  }
  
  // Add rate limit headers to successful responses
  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", "100");
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(result.resetInSeconds));
  
  return response;
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    // Match all routes except static files and api
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

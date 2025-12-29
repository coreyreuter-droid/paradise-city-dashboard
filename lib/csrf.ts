// lib/csrf.ts
// CSRF (Cross-Site Request Forgery) protection utilities
// Uses the double-submit cookie pattern

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const TOKEN_LENGTH = 32;

/**
 * Generate a random token using Web Crypto API (works in edge runtime)
 */
function generateToken(): string {
  const array = new Uint8Array(TOKEN_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Get or create CSRF token for the current session.
 * Call this in server components/layouts to ensure token exists.
 * 
 * Returns the token value (for passing to client components).
 */
export async function getOrCreateCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  const existingToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  
  if (existingToken && existingToken.length === TOKEN_LENGTH * 2) {
    return existingToken;
  }
  
  // Generate new token
  const newToken = generateToken();
  
  // Note: We can't set cookies directly in server components after Next.js 14
  // The cookie will be set via the CsrfProvider client component
  return newToken;
}

/**
 * Set CSRF cookie - call this from a route handler or server action
 */
export async function setCsrfCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by JavaScript
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

/**
 * Verify CSRF token from request.
 * Compares the token in the header with the token in the cookie.
 * 
 * @returns true if valid, false if invalid
 */
export async function verifyCsrfToken(request: NextRequest): Promise<boolean> {
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  
  // Both must exist
  if (!headerToken || !cookieToken) {
    return false;
  }
  
  // Must match
  if (headerToken !== cookieToken) {
    return false;
  }
  
  // Token must be valid format
  if (headerToken.length !== TOKEN_LENGTH * 2) {
    return false;
  }
  
  return true;
}

/**
 * Middleware helper to verify CSRF and return error response if invalid.
 * Use at the start of POST/PUT/DELETE API routes.
 * 
 * @returns null if valid, NextResponse error if invalid
 */
export async function requireCsrf(request: NextRequest): Promise<NextResponse | null> {
  const isValid = await verifyCsrfToken(request);
  
  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid or missing CSRF token. Please refresh the page and try again." },
      { status: 403 }
    );
  }
  
  return null;
}

/**
 * Export constants for client-side use
 */
export const CSRF_COOKIE = CSRF_COOKIE_NAME;
export const CSRF_HEADER = CSRF_HEADER_NAME;

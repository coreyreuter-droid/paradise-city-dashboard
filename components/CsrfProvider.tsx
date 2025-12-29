// components/CsrfProvider.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

type CsrfContextType = {
  token: string | null;
  isReady: boolean;
};

const CsrfContext = createContext<CsrfContextType>({
  token: null,
  isReady: false,
});

/**
 * Get CSRF token from cookie
 */
function getTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === CSRF_COOKIE_NAME) {
      return value || null;
    }
  }
  return null;
}

/**
 * Set CSRF cookie
 */
function setTokenCookie(token: string): void {
  if (typeof document === "undefined") return;
  
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CSRF_COOKIE_NAME}=${token}; Path=/; SameSite=Strict; Max-Age=${60 * 60 * 24}${secure}`;
}

/**
 * Generate a random token
 */
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * CSRF Provider - wrap your app with this to enable CSRF protection
 */
export function CsrfProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    // Try to get existing token from cookie
    let existingToken = getTokenFromCookie();
    
    // If no token exists, generate one and set cookie
    if (!existingToken) {
      existingToken = generateToken();
      setTokenCookie(existingToken);
    }
    
    setToken(existingToken);
    setIsReady(true);
  }, []);
  
  return (
    <CsrfContext.Provider value={{ token, isReady }}>
      {children}
    </CsrfContext.Provider>
  );
}

/**
 * Hook to get CSRF token
 */
export function useCsrfToken(): string | null {
  const { token } = useContext(CsrfContext);
  return token;
}

/**
 * Hook to check if CSRF is ready
 */
export function useCsrfReady(): boolean {
  const { isReady } = useContext(CsrfContext);
  return isReady;
}

/**
 * Helper to create fetch options with CSRF token
 */
export function csrfFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getTokenFromCookie();
  
  const headers = new Headers(options.headers);
  if (token) {
    headers.set(CSRF_HEADER_NAME, token);
  }
  
  return fetch(url, {
    ...options,
    headers,
    credentials: "same-origin", // Include cookies
  });
}

/**
 * Get headers object with CSRF token included
 * Use this when you need to add CSRF to existing headers
 */
export function getCsrfHeaders(existingHeaders?: HeadersInit): Headers {
  const headers = new Headers(existingHeaders);
  const token = getTokenFromCookie();
  
  if (token) {
    headers.set(CSRF_HEADER_NAME, token);
  }
  
  return headers;
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };

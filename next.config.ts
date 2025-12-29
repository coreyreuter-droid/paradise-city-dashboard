import type { NextConfig } from "next";

const securityHeaders = [
  {
    // Prevents clickjacking by controlling iframe embedding
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // Prevents MIME type sniffing
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Controls referrer information sent with requests
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Enables browser XSS protection (legacy but still useful)
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    // Controls browser features and APIs
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    // Content Security Policy - restricts resource loading
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires these
      "style-src 'self' 'unsafe-inline'", // Tailwind and inline styles
      "img-src 'self' data: blob: https:", // Allow images from any HTTPS source
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co", // Supabase API
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
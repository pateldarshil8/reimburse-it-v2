import type { NextConfig } from "next";

// Security headers, added as part of the auth-hardening pass documented in
// SECURITY_CASE_STUDY.md. Previously there were none at all -- see
// that document's "Static findings" section for why each of these matters.
//
// CSP is deliberately conservative rather than maximally strict: this app
// has no third-party scripts, inline event handlers, or external resources
// beyond same-origin assets and Supabase Storage's signed receipt URLs
// (loaded as <a>/<img> targets, not fetched cross-origin by script), so a
// same-origin-first policy costs nothing functionally while still ruling
// out injected third-party script execution.
const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js needs 'unsafe-inline' for its own hydration/runtime
      // scripts under the App Router without a nonce-based setup; no
      // third-party script origins are allowed.
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co",
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
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

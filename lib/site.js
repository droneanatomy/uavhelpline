// Canonical site origin, resolved from env. Set NEXT_PUBLIC_SITE_URL to your
// custom domain in production; otherwise fall back to the Vercel URL, then local.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

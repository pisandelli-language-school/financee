## 2025-07-28 - [Add HTTP Security Headers]
**Vulnerability:** Missing security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
**Learning:** Nuxt does not add these security headers by default. This makes the application vulnerable to clickjacking, MIME sniffing, and unintended information leakage via the Referer header.
**Prevention:** Always add `routeRules` in `nuxt.config.ts` to apply these essential security headers to all routes globally.

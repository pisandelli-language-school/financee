## 2025-07-09 - Add HTTP Security Headers using Nuxt routeRules
 **Vulnerability:** Missing HTTP security headers (e.g. X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security), potentially exposing the app to clickjacking, MIME-sniffing, XSS and MITM attacks.
 **Learning:** HTTP security headers are configured globally via Nuxt `routeRules` in `nuxt.config.ts` rather than relying on external dependencies like `@nuxt/security`. This provides a built-in, server-level way to enforce security policies.
 **Prevention:** Ensure `routeRules` with strict security headers is applied to `/**` (or appropriate paths) in any Nuxt application configuration to establish baseline protection by default.

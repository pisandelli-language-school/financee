## 2025-07-13 - Security Headers Configuration via Nuxt Route Rules
**Vulnerability:** Missing robust defense-in-depth headers such as `Content-Security-Policy` and `Permissions-Policy`.
**Learning:** Nuxt allows setting custom HTTP headers via `routeRules` directly in `nuxt.config.ts`. This provides a built-in way to add security headers globally without relying on external dependencies like `@nuxt/security`.
**Prevention:** Use `routeRules` in `nuxt.config.ts` to implement and enforce strict security headers (CSP, X-Frame-Options, Permissions-Policy, etc.) across the application natively.
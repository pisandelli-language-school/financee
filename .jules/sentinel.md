## 2024-05-15 - Missing Global Security Headers

**Vulnerability:** The application lacks global HTTP security headers (e.g., X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, Referrer-Policy, X-XSS-Protection). This increases the risk of various attacks, including Clickjacking, MIME-sniffing attacks, and Cross-Site Scripting (XSS).

**Learning:** Nuxt provides a native way to configure global HTTP security headers via `routeRules` in `nuxt.config.ts`. This is a clean and efficient alternative to using external dependencies like `@nuxt/security` for basic header configurations, particularly when a full-blown security module is not required.

**Prevention:** Always configure `routeRules` in `nuxt.config.ts` to include standard security headers (`X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Strict-Transport-Security`, `Referrer-Policy`) for all routes (`/**`).

## 2025-07-13 - Security Headers Configuration via Nuxt Route Rules
**Vulnerability:** Missing robust defense-in-depth headers such as `Content-Security-Policy` and `Permissions-Policy`.
**Learning:** Adding CSP and Permissions-Policy globally via routeRules carries regression risks without route-by-route validation.
**Prevention:** Introduce CSP and Permissions-Policy in a dedicated hardening pass with thorough validation per route, rather than a global blanket configuration that might break existing features.
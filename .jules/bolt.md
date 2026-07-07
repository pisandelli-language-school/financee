## 2025-07-15 - Nuxt Global Route Middleware Allocations
**Learning:** Arrays defined inside global `defineNuxtRouteMiddleware` cause unnecessary memory allocation and GC pressure on every single route navigation.
**Action:** Always hoist static configuration arrays outside the middleware function body and use `Set` for O(1) lookups in high-frequency global functions.

## 2024-05-24 - Debounce API calls on search input
**Learning:** Nuxt backoffice list pages had search inputs bound directly to API fetch functions (`refreshList`), leading to an API request on every keystroke.
**Action:** Use `@vueuse/core`'s `useDebounceFn` to create a debounced version of the fetch function and call that inside the search handler. This significantly reduces unnecessary API calls and improves performance.

## 2024-07-21 - [Debouncing Search Inputs in List Views]
**Learning:** List views that trigger data fetching based on search inputs (e.g., configurations pages) cause excessive state updates and backend API requests on every keystroke if not debounced.
**Action:** Always wrap search input handlers (e.g., `handleSearch`) with `@vueuse/core`'s `useDebounceFn` when they trigger data fetching in list views to prevent excessive state updates and backend API requests.

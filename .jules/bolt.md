## 2023-10-25 - Debounce Search Inputs
**Learning:** Synchronous search handlers in list views can cause excessive state updates and API calls on every keystroke, leading to performance bottlenecks.
**Action:** Always wrap search input handlers (e.g., handleSearch) with @vueuse/core's useDebounceFn when they trigger data fetching.

## 2024-07-19 - Missing Debouncing on Search Filters
**Learning:** Frequent events like typing in search inputs across list views lack debouncing, leading to excessive state updates and unnecessary API calls for each keystroke, which can cause significant performance bottlenecks and database load in backoffice screens.
**Action:** Always wrap search input handlers (e.g., `handleSearch`) with `useDebounceFn` (or equivalent debouncing mechanism) when they trigger data fetching or complex filtering, especially in data-heavy list views.

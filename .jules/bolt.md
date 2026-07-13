## 2024-07-13 - Debounce Search Fetching in Configurations
**Learning:** Found a pattern across backoffice list pages where `handleSearch` triggered immediate, synchronous API requests (`refreshList()`) on every keystroke, which can cause excessive network and database load.
**Action:** Always wrap the actual API fetch call (e.g., `refreshList`) with `useDebounceFn` (from `@vueuse/core`) instead of debouncing the `handleSearch` handler entirely, so that the store's filter state updates immediately for a snappy UI while the API request is delayed.

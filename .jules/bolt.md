## 2024-07-31 - Redundant summary API calls in list views
**Learning:** In list views where summary cards are displayed alongside the table, `watch` functions tracking an array of filters may trigger redundant backend requests (e.g., re-fetching summary data when only pagination or page-size changes).
**Action:** Always use the `(current, previous)` signature in `watch` arrays on filters. Selectively trigger independent API calls (like `loadSummaryComparisons()`) based on which specific filter fields actually affect that data.

## 2024-07-29 - Removed Redundant Summary Computation on List APIs
**Learning:** Returning summary metrics (like totals/groupings) alongside paginated list endpoints can lead to expensive, unused database queries if the frontend architecture delegates metric fetching to dedicated endpoints (or ignores them in generic list stores).
**Action:** Always verify if embedded summary/aggregation data in list responses is actually consumed by the client before keeping expensive `GROUP BY` queries in generic list endpoints.

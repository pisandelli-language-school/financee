## 2025-07-15 - Parallelize Prisma count and findMany for paginated queries
**Learning:** Paginated list queries using Prisma previously executed `itemsPromise` and `countPromiseFactory()` sequentially, causing a sequential network waterfall where the database wait times added up.
**Action:** When executing paginated queries, use `Promise.all` to fetch the items and the total count concurrently. This removes the sequential waterfall and improves the performance of all list views in the backoffice.

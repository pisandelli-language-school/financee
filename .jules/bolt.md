## 2024-05-18 - [Promise caching prevents Thundering Herd]
**Learning:** In highly concurrent code like `Promise.all` mapping over arrays (e.g., in financial recurrence operations), database reads for static configuration tables like non-business days can cause massive N+1 query spikes. Merely caching the data is not enough if all promises fire simultaneously before the first one resolves.
**Action:** When caching database results for concurrent use, cache the *Promise itself* using a TTL. Make sure to `.catch()` and clear the cache so transient errors are not artificially prolonged.

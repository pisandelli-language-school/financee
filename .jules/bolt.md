## 2024-07-14 - Prisma Sequential DB Writes Bottleneck
**Learning:** Sequential Prisma `.create()`, `.update()`, and `.deleteMany()` calls in the backend API were creating an unnecessary N+1 roundtrip bottleneck. Complex entity updates (like Contacts) were doing up to 6 distinct sequential roundtrips.
**Action:** Use `prisma.$transaction()` to batch independent write operations. This dramatically reduces network roundtrips from N to 1 and improves backend endpoint latency while also ensuring atomicity.

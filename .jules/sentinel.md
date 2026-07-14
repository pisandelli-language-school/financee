## 2025-07-15 - Unhandled Error Information Exposure
**Vulnerability:** Raw exceptions (such as Prisma ORM errors) are being re-thrown directly to the client in API error handlers without proper sanitization. This can expose sensitive database schemas, connection strings, or query details to external users.
**Learning:** Returning `throw error` at the end of catch blocks allows internal system errors to leak into API responses.
**Prevention:** Always catch and handle generic errors gracefully by logging the internal error details server-side and returning a generic, safe HTTP 500 error to the client instead of the raw stack trace or exception object.

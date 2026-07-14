## 2025-02-14 - Missing Email Validation in Backoffice API
**Vulnerability:** Input fields containing email addresses for Contacts and Financial Responsible were not validated against a standard email format before being saved to the database. This allowed malicious or malformed data to be persisted.
**Learning:** Even when the frontend employs form validation (e.g., Zod), backend validation is strictly required for data integrity and security, ensuring bad actors cannot bypass the client and insert invalid or potentially harmful data directly into the database.
**Prevention:** Enforce input validation across all endpoints that receive user input using standard validation routines (like regex for emails) before interacting with the database.

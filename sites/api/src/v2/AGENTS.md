Each category in this file should have three primary components:
- `hono.ts` - Where the route handling lives. Reference `qbo` for a summary of how to handle this file.
- `db.ts` - Functions that directly integrate with D1 database. These should be async and clearly defined via JSDoc.
- `internal.ts` - Where the heavy logic functions go and helpers. These are typically cross-compatible. For instance, `company` internal can import `qbo` internal for use of it's scripts.
- Any general helper functions should go into `cfdg/scripts` and be imported for one source of truth.
# Purpose

The purpose of this site is to provide the shared back-end API for White Point Survey apps. It runs as a Cloudflare Worker and supports integrations such as D1, KV, and Brevo email delivery.

# Ownership

- This site owns API routes, request validation, service integration, database access, and worker-specific behavior.
- Shared constants, reusable types, and pure data utilities should live in `packages/cfdg/scripts` when they are needed outside this API.
- Front-end display behavior belongs in the consuming front-end site or shared UI packages, not in this API.

# Constraints

- Preserve existing route behavior unless the requested change explicitly modifies it.
- Prefer the existing router and middleware patterns until a migration plan is requested.
- Do not expose secrets, API keys, account IDs, or environment-specific credentials in source files.
- Treat D1 migrations and KV interactions as production-sensitive. Keep changes focused and easy to review.
- Email behavior using Brevo should be explicit, testable, and careful about duplicate sends.

# Design Criteria

- Keep route handlers small enough to review. Move repeated business logic into local services or shared packages when appropriate.
- Validate request inputs close to the route boundary.
- Return consistent response shapes for related endpoints.
- Use concise JSDoc for exported types, functions, constants, and route helpers.

# Verification

- Use `pnpm --filter sites-api run dev` for local API development when needed.
- Use `pnpm --filter sites-api run build` for API build verification.
- Use `pnpm --filter sites-api run d1:migrate:local` for local D1 migration checks when a database migration is changed.
- Prefer local verification before any remote migration or deploy command.

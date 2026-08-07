# Purpose

The purpose of this site is to provide client-facing invoice access and payment workflows.
This site should prioritize clarity, trust, and low-friction payment completion.

# Ownership

- This site owns tokenized invoice access routes and payment UI flows.
- Shared UI primitives should come from `packages/cfdg/input` and `packages/cfdg/layout` when they fit.
- Shared scripts and types should come from `packages/cfdg/scripts` and `packages/cfdg/types`.

# Constraints

- Keep the phase-1 scope focused on tokenized invoice access and payment.
- Do not introduce bulk payment support in this branch.
- Avoid exposing internal-only PM or CRM operations in this site.

# Design Criteria

- The primary design direction is `Client Billing Portal`.
- Favor straightforward payment-focused flows with clear status messaging.
- Consider both `light` and `dark` color modes when using shared components.

# Verification

- Use `pnpm -r --parallel --filter api --filter client run dev` for local integration.
- Use `pnpm --filter client run build` for site build verification.

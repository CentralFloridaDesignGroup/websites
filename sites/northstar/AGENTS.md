# Purpose

The purpose of this site is to provide White Point Survey's internal PM and CRM workflows.
This site should prioritize high-signal operational views, fast task execution, and clear
project/accounting context for internal users.

# Ownership

- This site owns PM and CRM route surfaces migrated from document workflows.
- Shared UI primitives should come from `packages/cfdg/input` and `packages/cfdg/layout` when they fit.
- Shared scripts and types should come from `packages/cfdg/scripts` and `packages/cfdg/types`.

# Constraints

- Preserve behavior parity while migrating features from `sites/document`.
- Prefer small, reviewable migration slices over large rewrites.
- Keep group-based access controls in place for internal workflows.

# Design Criteria

- The primary design direction is `Internal Operations Workspace`.
- Favor dense, clear interfaces for repeated operational work.
- Consider both `light` and `dark` color modes when using shared components.

# Verification

- Use `pnpm -r --parallel --filter api --filter northstar run dev` for local integration.
- Use `pnpm --filter northstar run build` for site build verification.

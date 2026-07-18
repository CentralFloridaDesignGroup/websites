# Purpose

The purpose of this site is to provide the main public-facing or brand-oriented White Point Survey experience. This site should communicate the company clearly while using shared systems where practical.

# Ownership

- This site owns main-site pages, routes, brand presentation, marketing-oriented UI, and site-local content components.
- Shared UI components should come from `packages/@wps/layout` or `packages/@wps/input` when they fit the use case.
- Shared types, constants, and pure utilities should come from `packages/@wps/scripts` when they are reused beyond this site.

# Constraints

- Preserve existing brand direction unless the requested change explicitly modifies it.
- Avoid operational/document-site UI density unless the page or workflow calls for it.
- Do not add new marketing copy, claims, certifications, service areas, or legal language unless supplied by the user or clearly already present in the repo.
- Keep public-facing content polished, accurate, and easy to scan.

# Design Criteria

- The primary design direction is `Brand Marketing UI`.
- Favor responsive, polished presentation with clear hierarchy and strong readability.
- Use real company context and existing brand language where available.
- Consider both `light` and `dark` color modes when using shared components.
- Use Lucide icons where they support navigation, calls to action, or service clarity.

# Verification

- Use `pnpm -r --parallel --filter sites-main --filter sites-api run dev` when the Main site depends on API behavior.
- Use `pnpm --filter sites-main run build` for Main site build verification.
- Use the root `type-check` and `lint` commands when changes touch shared packages or cross-site behavior.

# Purpose

The purpose of this folder is to contain deployable site applications for White Point Survey. Site applications may be front-end apps, back-end apps, or Cloudflare Worker services.

Each site folder contains further instructions for that specific application. For work inside a site folder, use this file along with the root `AGENTS.md` and the nearest site-specific `AGENTS.md`.

# Shared Site Guidance

- Prefer shared code from `packages` when behavior, types, constants, or components are reused across multiple sites.
- Site-local components should live under the relevant site's `src/components` area when they are only useful to that site.
- Avoid duplicating business rules across sites. Move shared rules into `packages` when a second site needs them.
- Keep site changes focused on the requested feature, bug, or workflow.
- Respect existing routing, data-loading, styling, and file-organization patterns before adding new ones.

# Design Criteria

- Front-end sites use React, Vite, Tailwind, and Lucide.
- Use shared UI packages when they fit the task before creating site-specific UI.
- Consider both `light` and `dark` color modes when using shared components or shared visual patterns.
- Do not add new dependencies unless their usefulness outweighs the long-term cost of maintaining them.

# Verification

- Use the root script references for site-specific development, build, lint, and type-check commands.
- When changing shared behavior between a site and `sites/api`, verify the front-end and API together when practical.
- When creating smoke tests for repeatable site workflows, place them in the root `tests` folder.

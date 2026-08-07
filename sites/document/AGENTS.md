# Purpose

The purpose of this site is to provide document, field, and operations tooling for White Point Survey. This site should prioritize reliable workflows, dense data-entry screens, and clear operational feedback.

# Ownership

- This site owns document-specific pages, routes, workflows, and site-local components.
- Shared UI primitives should come from `packages/cfdg/input` or `packages/cfdg/layout` when they fit.
- Shared types, constants, and pure utilities should come from `packages/cfdg/scripts` when they are reused beyond this site.
- Site-local components should stay in this site when they are specific to document workflows.

# Constraints

- Preserve existing document workflows unless the requested change explicitly modifies them.
- Avoid broad visual redesigns unless requested.
- Treat D1 and KV-backed flows as integration-sensitive. Verify API assumptions when changing data workflows.
- CXL generator work lives in `sites/document/src/pages/field/tools/cxlEditor` and may have additional folder-specific instructions.

# Design Criteria

- The primary design direction is `Industrial Operations Form`.
- Favor dense, readable desktop workflows over marketing-style presentation.
- Optimize forms and tables for repeated use, scanning, validation, and quick correction.
- Consider both `light` and `dark` color modes when using shared components.
- Use Lucide icons where they clarify actions without adding visual clutter.

# Verification

- Use `pnpm -r --parallel --filter sites-document --filter sites-api run dev` when the Document site depends on API behavior.
- Use `pnpm --filter sites-document run build` for Document site build verification.
- Use the root `type-check` and `lint` commands when changes touch shared packages or cross-site behavior.

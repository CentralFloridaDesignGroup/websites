# Mistakes

## 2026-08-17 - Repaired an unobserved address route

- Mistake: Initially fixed the Project Management V1 customer normalizer without first matching it to the browser requests from the affected invoice workflow.
- Cause: Inferred the active API boundary from the reported feature instead of tracing the observed request URLs.
- Fix: Used the server logs to identify `/api/qbo/customers/:id/projects` and corrected `sites/document/src/api/qbo.ts`, which the invoice editor actually uses.
- Reference: For data-loading defects, anchor the first repair to the observed request URL and its exact frontend consumer.

## 2026-08-15 — Compressed implementation formatting

- Mistake: Added large one-line JSX and handler blocks instead of preserving readable line breaks.
- Cause: Optimized for a compact patch and mirrored some existing compressed code too literally.
- Fix: Keep JSX props, handlers, conditional branches, and object literals on readable multiline layouts, even when the surrounding file contains older compressed sections.
- Reference: Reviewability and maintainability take priority over minimizing line count.

## 2026-08-15 — Project manager readback omitted

- Mistake: The project manager was written during Save Project but remained `Not assigned` in view mode.
- Cause: `getProjectExtraData` only selected `qbo_id` and `status`, omitting both `project_manager` and `purchase_order` from the readback response.
- Fix: Return `project_manager` and `purchase_order` from the project extra-data query so saved values are mapped back to the UI.
- Reference: Every field written by a project update must be included in the corresponding read/query path.

## 2026-08-15 — Project editor controls and save flow

- Mistake: Replaced the project edit module with native HTML controls instead of the existing `cfdg/ui` components, left status and purchase order out of the edit draft, and left the top-level project save action unwired.
- Cause: Implemented the new project/contact fields locally in the section without first mapping the existing shared input and save patterns.
- Fix: Move the complete project draft to the detail page, use `NorthstarTextbox`, `NorthstarDropdown`, `NorthstarCheckbox`, and `NorthstarButton`, and save status, purchase order, PM, address, and contact assignments through the top-level Save Project action.
- Reference: Project edits should use the shared Northstar input components and one source of truth for save state.

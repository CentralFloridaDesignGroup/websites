# Purpose

The purpose of this package is to handle combined or complex components. This includes, but is not limited to:
- layouts
- modals
- dialogs
- shared component groups

This package is not intended to handle basic UI inputs. See `packages/cfdg/input` for the correct area.

# Constraints

- Items and components created prior to the creation of this file are grandfathered in.
- Items and components created after the creation of this file are subject to the rules and constraints.
- Items previously created, but requiring modification, should be brought up to these standards within the touched area when practical.

# Design Criteria

- The overall design goal is `Industrial Operations Form` for `document` and `Brand Marketing UI` for `main`. If a component is for both, default to `Brand Marketing UI`.
- Exported UI components should accept a `colorMode` prop with `light`, `dark`, or `auto`. Default value should be `light`.
  - `light` UI elements should be planned to be on a white background (`bg-white`). 
  - `dark` UI elements should be planned to be on either `bg-neutral-900` or `bg-gray-800` backgrounds.
  - `auto` UI elements should assume both `light` and `dark` classNames will be used.
- UI elements have access to the following:
  - Tailwind for styling.
  - Lucide React Icons.
  - Headless UI for core building blocks.
- All exported types, interfaces, functions, and components should have high-quality, concise JSDoc notes.

# Guardrails

- Layout components are responsible for their own outer wrapper and internal behavior, but not for page-level spacing, surrounding padding, or placement relative to unrelated components.
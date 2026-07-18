# Purpose

The purpose of this package is to handle user interaction components. This includes, but is not limited to:
- Textboxes
- Textareas
- Buttons
- Checkboxes
- Comboboxes

This package is not intended to handle layouts or complex components. See `packages/@wps/layout` for the correct area.

# Constraints

- Items and components created prior to the creation of this file are grandfathered in.
- Items and components created after the creation of this file are subject to the rules and constraints.
- Items previously created, but requiring modification, should be brought up to these standards within the touched area when practical.

# Design Criteria

- The overall design goal is `Industrial Operations Form`. Spacing is handled in other modules.
- Exported UI components should accept a `colorMode` prop with `light`, `dark`, or `auto`. Default value should be `light`.
  - `light` UI elements should be planned to be on a white background (`bg-white`). 
  - `dark` UI elements should be planned to be on either `bg-neutral-900` or `bg-gray-800` backgrounds.
  - `auto` UI elements should assume both `light` and `dark` classNames will be used.
- Key points for UI elements:
  - Dense desktop data-entry format. Spacing will be handled by the front-end if needed.
  - Flat industrial UI.
  - Engineering or CAD-adjacent feel.
  - Simple text and optimized for readability.
- UI elements have access to the following:
  - Tailwind for styling.
  - Lucide React Icons.
  - Headless UI for core building blocks.
- All exported types, interfaces, functions, and components should have high-quality, concise JSDoc notes.

# Guardrails

- All UI elements should be usable as either `controlled` or `uncontrolled` components.
- The limit of responsibility is the `div` that contains a `label`, optional `description`, `input` and `error` section. Everything outside of the div, including padding with other elements and components, are outside this scope.
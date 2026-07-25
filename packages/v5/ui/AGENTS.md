This is for `v5` of this repo.

This package is the combined home of what used to be `input` and `layout`. This will contain common primitives and more updated but still shared layout components.

# Constraints

- Nothing is grandfathered in. Everything in this package is new and manually created.

# Design Criteria

- Exported UI components should accept a `colorMode` prop with `light`, `dark`, or `auto`. Default value should be `light`.
  - `light` UI elements should be planned to be on a white background (`bg-white`). 
  - `dark` UI elements should be planned to be on either `bg-neutral-900` or `bg-gray-800` backgrounds.
  - `auto` UI elements should assume both `light` and `dark` classNames will be used.
- Key points for UI elements:
  - Spacing with other components and elements will be handled by the front-end if needed.
- UI elements have access to the following:
  - Tailwind for styling.
  - Lucide React Icons.
  - Headless UI for core building blocks.
- All exported types, interfaces, functions, and components should have high-quality, concise JSDoc notes.

# Guardrails

- All UI elements should be usable as either `controlled` or `uncontrolled` components.
- The limit of responsibility is the component itself. Have a plan for I/O, but the limit of responsibility is internal only.
- Functionality should be similar between like elements. A textbox and textarea should operate 90% similar with specifics of each being the only change.
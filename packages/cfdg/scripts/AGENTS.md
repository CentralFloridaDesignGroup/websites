# Purpose

The purpose of this package is to contain shared typescript functions, constants, and types. This package should not contain components.

# Constraints

- Items created prior to the creation of this file are grandfathered in.
- Items created after the creation of this file are subject to the rules and constraints.
- Items previously created, but requiring modification, should be brought up to these standards within the touched area when practical.

# Design Criteria

- This package should contain three categories of items: `scripts` for calculations and data manipulation, `constants` for a single point of truth throughout the apps, and `types` specifying a single point of truth in definitions across all the apps.
- All exported types, interfaces, and scripts should have high-quality, concise JSDoc notes.
- Naming of scripts, constants, and types should be as follows:
  - `scripts` should use `camelCase`
  - `constants` should use `SCREAMING_SNAKE_CASE`
  - `types` should use `PascalCase`
- If a script is marked as `async`, a JSDoc entry specifying why should be present.
- A JSDoc entry without `param`, `returns`, or `async` can be one line. Otherwise, follow general JSDoc formatting.

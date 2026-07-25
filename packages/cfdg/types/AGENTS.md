# Purpose

The purpose of this package is to contain shared typescript types and constants. This package should not contain components, functions*, or other items that are not able to be imported via specifying `type` in the import statement or act as a single source of truth.
There is one exception to the functions ban: Mapping functions for converting D1 database records into actual types are allowed to live within the same type file as the type definition for simplicity.


# Design Criteria

- This package should contain only two categories of items: `types` specifying a single point of truth in definitions across all the apps. `constants` which are used for a single source of truth throughout all other packages and sites.
- All exported constants, types, and interfaces should have high-quality, concise JSDoc notes.
- Naming of types should be as follows:
  - `types` should use `PascalCase`
  - `constants` should use `SCREAMING_SNAKE_CASE`.

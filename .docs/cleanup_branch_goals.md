# Git `cleanup` Branch Goals

Branch Name: `cleanup`
Date Branch Opened: `2026-07-25`
Date Branch Scope Completed: 
Date Branch Merged:

## Overview
You are currently on a branch called `cleanup` for github. This is meant to be a pause on new development, review the current code, and cleanup AI-generated code, add JSDoc code, and reorganize sections as required for a more streamlined codebase for future development. The goals are as follows:

## A. Packages

1. [ ] Rename containing folder from `@wps` to `cfdg`.

### I. `Input` Package

1. [ ] Deprecate the package. Combine into a new `UI` package with items from `layout`.

### II. `Layout` Package

1. [ ] Deprecate the package. Combine into a new `UI` package with items from `input`.

### III. `Scripts` Package

1. [ ] Split this package. Functions to remain in this package. Types should be moved to a new `types` package.
1. [ ] Complete a JSDoc review of all exported functions.
1. [ ] Complete an organization pass for exports, allowing more targeted imports into end-components.
1. [ ] Perform module updates and checks.

### IV. NEW `UI` Package
1. [ ] Combine `input` and `layout` into one package for easier management.
1. [ ] Create 'core' ui components that will be expandable and stylized by middleware components.
1. [ ] Review current props and unify how props are handled, generated, and stylized.
1. [ ] Perform module updates and checks.

## B. Sites

### I. `api` Site
1. [ ] Split src `.ts` files into `functions` and `routes` for easier maintainability.
1. [ ] Create a D1 map for current schema and refactoring later.
1. [ ] Review JSDocs for functions and routes.
1. [ ] Perform module updates and checks.

### II. `main` Site
1. [ ] Review current layouts, SEO, and components.
1. [ ] Perform module updates and checks.

### III. `document` Site
To be created. This branch is not complete without a checklist being present and marked as completed.
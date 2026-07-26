# Git `cleanup` Branch Goals

Branch Name: `cleanup`
Date Branch Opened: `2026-07-25`
Date Branch Scope Completed: 
Date Branch Merged:

## Overview
You are currently on a branch called `cleanup` for github. This is meant to be a pause on new development, review the current code, and cleanup AI-generated code, add JSDoc code, and reorganize sections as required for a more streamlined codebase for future development. The goals are as follows:

## A. Packages

1. [x] Rename containing folder from `@wps` to `cfdg`. `2026-07-25` `83bb3142a142ec7d069d35ba0b49e1fdff22efd2`

### I. `Input` Package

1. [ ] Deprecate the package. Combine into a new `UI` package with items from `layout`.

### II. `Layout` Package

1. [ ] Deprecate the package. Combine into a new `UI` package with items from `input`.

### III. `Scripts` Package - `Completed`

1. [x] Split this package. Functions to remain in this package. Types should be moved to a new `types` package.`2026-07-25`
    - Relevant commits:
      - `20ed97ebe522852c6514f7f147bd56a4c20c1195`
      - `5ae45187fe10595480cd4280008d28d65813f3dc`
1. [x] Complete a JSDoc review of all exported functions. `2026-07-25`
    - Relevant commits:
      - `20ed97ebe522852c6514f7f147bd56a4c20c1195`
      - `35e5df920e19c41a1d93831b9000dfce4413069d`
      - `3a5e21baf0d7a034f24de2f42b45bd122b8b99ab`
      - `30ff90a26702aa1977f0db5b503276503ff622fa`
      - `3b065501cc98c6c5b89afd786b56f3b7180c5d32`
      - `5ae45187fe10595480cd4280008d28d65813f3dc`
      - `2cedb1bd1552f55cdd50f81eb1c609b950ab7220`
1. [x] Complete an organization pass for exports, allowing more targeted imports into end-components. `2026-07-25`
    - Relevant commits:
      - `20ed97ebe522852c6514f7f147bd56a4c20c1195`
      - `35e5df920e19c41a1d93831b9000dfce4413069d`
      - `3a5e21baf0d7a034f24de2f42b45bd122b8b99ab`
      - `30ff90a26702aa1977f0db5b503276503ff622fa`
      - `3b065501cc98c6c5b89afd786b56f3b7180c5d32`
      - `2cd8ffaf07289ad526eb8b593729f601821bca15`
      - `5ae45187fe10595480cd4280008d28d65813f3dc`
1. [x] Perform module updates and checks.
    - Relevant commits:
      - `f16015a9a668cf57e2544d1742c9ae538229e638`

### IV. NEW `UI` Package
1. [ ] Combine `input` and `layout` into one package for easier management.
1. [ ] Create 'core' ui components that will be expandable and stylized by middleware components.
1. [ ] Review current props and unify how props are handled, generated, and stylized.
1. [ ] Perform module updates and checks.
    - Relevant commits:
      - `6eb4fae0cfc45ad25a535d17412905690da72138`

## B. Sites

### I. `api` Site
1. [ ] Split src `.ts` files into `functions` and `routes` for easier maintainability.
1. [ ] Create a D1 map for current schema and refactoring later.
1. [ ] Review JSDocs for functions and routes.
1. [ ] Perform module updates and checks.
    - Relevant commits:
      - `6eb4fae0cfc45ad25a535d17412905690da72138`

### II. `main` Site
1. [ ] Review current layouts, SEO, and components.
1. [ ] Perform module updates and checks.
    - Relevant commits:
      - `6eb4fae0cfc45ad25a535d17412905690da72138`

### III. `document` Site
To be created. This branch is not complete without a checklist being present and marked as completed.

## C. General Closeout
1. [ ] Verify full compile of all packages and sites.
2. [ ] Verify package sizing
3. [ ] Verify Cloudflare publishing
4. [ ] Verify production versions
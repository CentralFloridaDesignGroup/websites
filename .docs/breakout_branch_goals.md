# Git `breakout` Branch Goals

Branch Name: `breakout`
Date Branch Opened: `2026-08-07`
Date Branch Scope Completed:
Date Branch Merged:

## Overview
This branch establishes the initial breakout architecture for Compass feature separation.
The goal is to separate PM and CRM workflows into a new internal site named `northstar`,
separate client-facing payment workflows into a new site named `client`, and begin a
clean migration track for a new D1 database using a separate `migrations_v2` stream.

## A. Sites

### I. New `northstar` Site
1. [ ] Create `sites/northstar` using current site conventions (React, Vite, Tailwind, Wrangler).
1. [ ] Add root-level scripts for dev/build/deploy for `northstar`.
1. [ ] Begin extraction of PM and CRM feature surfaces from `document` into `northstar`:
   - invoices manager
   - clients manager
   - projects manager
   - proposal generator
1. [ ] Preserve group-gated access controls for internal PM and CRM features.

### II. New `client` Site
1. [ ] Create `sites/client` using current site conventions (React, Vite, Tailwind, Wrangler).
1. [ ] Add root-level scripts for dev/build/deploy for `client`.
1. [ ] Implement tokenized invoice view and payment flow.
1. [ ] Add a token-scoped flow to view other open invoices for the same client context.
1. [ ] Explicitly defer bulk payment support.

### III. Existing `document` Site
1. [ ] Keep existing document, office, and field workflows intact while PM and CRM are moved.
1. [ ] Add transition routing and/or links as PM and CRM screens relocate to `northstar`.

## B. API

### I. Routing Strategy
1. [ ] Keep one API Worker and introduce clear route namespacing boundaries for Compass, Northstar, and Client concerns.
1. [ ] Keep existing Compass routes stable during incremental migration.

### II. Data Access Strategy
1. [ ] Introduce a second D1 binding (`DB_NORTHSTAR`) for breakout work.
1. [ ] Keep `DB` bound to existing `compass` behavior until each feature is moved.
1. [ ] Add feature-by-feature cutover strategy instead of big-bang migration.

## C. Database Migration Strategy

### I. Existing Compass Stream
1. [ ] Keep `sites/api/migrations` for existing Compass schema evolution and critical fixes only.

### II. New Breakout Stream
1. [ ] Create `sites/api/migrations_v2`.
1. [ ] Add dedicated scripts to apply `migrations_v2` separately from Compass migrations.
1. [ ] Ensure `migrations_v2` is managed independently and does not alter existing Compass tables.
1. [ ] Shift v2 schema ownership toward migration files rather than runtime schema creation.

## D. Validation and Closeout
1. [ ] Verify `lint` passes at repo root.
1. [ ] Verify repo `type-check` passes including `northstar` and `client`.
1. [ ] Verify site builds for `main`, `document`, `northstar`, `client`, and `api`.
1. [ ] Verify local migration apply for both streams:
   - `migrations` (Compass)
   - `migrations_v2` (Breakout)
1. [ ] Verify deployment script coverage exists for all four sites plus API.

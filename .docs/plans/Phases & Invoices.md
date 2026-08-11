# Phases

Phases are actual contract terms within a `project`. Each project will have at least one phase, but can have `n` amount. Each phase can also have `sub-phases` to `x` depth. Phases are `project-level` items. While there is a window to modify the details (given high-level permissions), the majority of the time, the user will interact with the summery view for the tasks.

## D1 Table Breakdown

- `id`* - Internal reference ID
- `qbo_id`* - Reference to `qbo_customers_projects.qbo_id`. As a reminder, a `project` in said table is one where the `parent_id` of the row is occupied with a value. `Customers` do not have a parent_id.
- `parent_id` - Reference to another phase `id`. Indicates a sub-phase.
- `phase_id`* - Arbitrary text identifier for the phase or sub-phase. Can be `A`, `1.` or `iii`.
- `name`* - Name of the phase in plain language. Not a full description.
- `description` - Full description of the phase. Will be referenced in other sections for help with processing and knowledge.
- `bill_type`* - Can be `fixed-fee`, `time-and-materials`, or `non-billable`.
- `active`* - `0` for inactive and un-selectable, `1` for active and selectable.
- `billable`* - `0` to block inclusion in invoices, `1` to include in invoices.
- `contract_cents`* - Amount in USD cents for the contract phase. Must be above 0. 0 indicates the phase has children.
- `retainer_cents`* - Amount in USD cents for the retainer of the phase for record-keeping only. Must be at or above 0.
- `billed_cents`* - Amount in USD cents billed to the client. Must be at or above 0.
- `income_cents`* - Amount in USD cents received from the client. Must be at or above 0.
- `phase_project_manager` - ID of the project manager for the phase. If null, assume the project manager from `project_extra_data.project_manager` field.
- `created_time`* - ISO Datetime for the creation of this phase.
- `created_id`* - ID of the employee who created the phase.
- `updated_time` - If the task was modified after creation, the ISO Datetime of the modification.
- `updated_id` - ID of the employee who updated the phase.

`*` indicates required fields that cannot be null.

## Expected Type Definition

`Phase`
- `id` - Internal reference ID
- `qboId` - ID of the owning project. Should allow for cross linking into the `project` detail page.
- `phaseId` - The arbitrary text identifier
- `name` - the full name of the phase
- `description?` - The description of the phase.
- `billType` - `fixedFee`, `timeAndMaterials`, `nonBillable`
- `accounting` - Object containing:
  - `contractCost` - Amount in decimal format. Required to multiply by 100 and round for storage.
  - `retainerCost` - Amount in decimal format. Required to multiply by 100 and round for storage.
  - `billedAmount` - Amount in decimal format. Required to multiply by 100 and round for storage.
  - `incomeAmount` - Amount in decimal format. Required to multiply by 100 and round for storage. 
- `active` - bool
- `billable` - bool
- `projectManagerId?` - See table definition.
- `created` - object containing: 
  - `date` - Datetime
  - `id` - ID of the user
- `modified?` - object containing: 
  - `date` - Datetime
  - `id` - ID of the user
- `subPhases` - Array of other phases where their `parent_id` matches this phase's `id`.

`PhaseListItem`
- `id`
- `phaseId`
- `name`
- `billType`
- `accounting` full object
- `active`
- `billable`
- `projectManagerId`
- `subPhases`

`PhaseDropdownItem`
- `id`
- `phaseId`
- `name`
- `active`

## Workflows

### Invoicing
When a new invoice is created, it will pull all the `phases` for the selected project. The view will be a table view. Each row will contain the basic information. Specifically, the project manager should be able to see how much was previously billed in each phase, adjust how much we will bill in the invoice by either percentage or direct cost entry. There should be checks to verify the new bill value is at or greater than the phase's `accounting.billedAmount` line.

If a phase has sub-phases, the `accounting` section for the parent phase is ignored, replaced by a summery of the values of the sub-phases. For instance. `Phase 1` has `Phase 1A` and `Phase 1B`. `(Phase 1)accounting.contractCost` is ignored and replaced with `(Phase 1A)accounting.contractCost + (Phase 1B)accounting.contractCost`.

A sub-phase can only be added to a phase if the `accounting.billedAmount` and `accounting.incomeAmount` are `0`. If the task has previous billing, the system should not be complicated to accommodate the change.

All `phases` and `sub-phases` must share the same `qbo_id` to be valid and easily indexable and searchable.

If a parent's status is changes from `active` to `inactive` or `billable` to `un-billable`, all children phases should be updated.

The front end UI and API will be responsible for validating circular references and stopping the submittal to the API.

`phase_id` must be unique among phases sharing the same `project` and `parent`. Comparison is case-insensitive and ignores leading/trailing whitespace.
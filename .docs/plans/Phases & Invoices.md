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
When a new invoice is created, it will pull all the `phases` for the selected project. The view will be a table view. Each row will contain the basic information. Specifically, the project manager should be able to see how much was previously billed in each phase, adjust how much we will bill in the invoice by either percentage or direct cost entry. There should be checks to verify the new cumulative billed value is at or greater than the phase's `accounting.billedAmount` line. The `phase` holds the cumulative billing history, while the invoice holds the specific costs for that invoice. When a new invoice is being created, the phase's cumulative billed value cannot be reduced. Either the same value (no invoice line item) or a greater value (an invoice line item for the difference) can be valid. For fixed-fee phases, the cumulative billed value must not exceed the phase's contract value. The cumulative billed value and invoice line items must be updated together in one transaction when the invoice becomes `Active`.

If a phase has sub-phases, the `accounting` section for the parent phase is ignored, replaced by a summery of the values of the sub-phases. For instance. `Phase 1` has `Phase 1A` and `Phase 1B`. `(Phase 1)accounting.contractCost` is ignored and replaced with `(Phase 1A)accounting.contractCost + (Phase 1B)accounting.contractCost`.

A sub-phase can only be added to a phase if the `accounting.billedAmount` and `accounting.incomeAmount` are `0`. If the task has previous billing, the system should not be complicated to accommodate the change.

All `phases` and `sub-phases` must share the same `qbo_id` to be valid and easily indexable and searchable.

If a parent's status is changes from `active` to `inactive` or `billable` to `un-billable`, all children phases should be updated.

The front end UI and API will be responsible for validating circular references and stopping the submittal to the API.

`phase_id` must be unique among phases sharing the same `project` and `parent`. Comparison is case-insensitive and ignores leading/trailing whitespace.

# Invoices

Invoices are the link between contracted work and payments. Each project can have one or `n` invoices. Each invoice can both reference contract line items (known as being a `linked line item`) or not referenced to any line item (known as `unlinked line item`)

## Line Items

Each line item is controlled by the actual `cents` of the line item, not the `percentage`. Users are able to enter percentages for ease of calculation, but the important information always relates to the cents. There is one line item per billable row in the `invoice`. For sub-phases, the name of the row should include the joint phase ID, followed by the name of the specific phase.
```js
{
  phaseId="A",
  name="Text Phase",
  subphases=[
    {
      phaseId="1",
      name="Test sub-phase",
    }
  ]
}
```
The above `Phase` snippet would result in a line item being named `Phase A.1 - Test sub-phase`

For each sub-phase line-item, an informational line item should be included, showing the sum of the sub-phases. This will operate the same way as the actual phase organization. These items should be stored as information only in the DB and not included in the sum. Their styling client-side should also be reflective of their informational status with italics and row indents. Informational rows are never billable and must not be included in invoice totals.

When an invoice becomes `Active`, all linked line items must retain a snapshot of the client-facing phase information used on that invoice, including the phase path/name, description, contract amount, percentage complete, and billed amount. Historical invoices must not change when the related phase, project, client, contact, or address is later modified. The related phase reference may be retained for reporting, but live phase data must not be used to render an active, paid, void, or refunded invoice.

## Invoice

`Invoices` are a collection of `Line Item` objects. This is the first `client-view` object. An invoice is the actual asking of money from the client, and most clients want to see specific information on the invoice.
- Our name, logo, address, and telephone number.
- The word `INVOICE` along with a specific and unique invoice ID.
- The client's name, project manager / contact person, and address.
- The project id, name, and address.
- A purchase order number if one is provided.
- A create date and due date.
- Line items with `Description`, `% Complete`, `Contract Amount`, `Billed Amount`.
- A summary of costs, together with `previously billed` and `payment received` fields, if needed.
- A large `TOTAL:` field.
- If the invoice is `void` or `paid`, it should clearly state as such.
- A link to the payment site if being viewed digitally.

An invoice status can be:
- `Draft` The invoice is actively being created, reviewed, and modified. The public `created date` will not be populated at this stage. The user will be able to select from a list of payment terms of `dueOnReceipt`, `net30`, `net45`, `net60`, and `payWhenPaid`. All terms, less `payWhenPaid`, will set a due date based on when the status is set to `active` (a term of `net30` when the status is set to active on `2026-06-15` will result in a due date of `2026-07-15`). `dueOnReceipt` will show `Due on Receipt` on the invoice, `payWhenPaid` will show as `Pay When Paid`, and the remaining `net*` shall show the due date. `payWhenPaid` should be stored as a null value in the DB.
- `Active` The invoice is active for the client to view, print, and pay. Once this status is active, it cannot be taken back.
- `Paid` The invoice has received a payment in the system. Partial payments are not supported. Payment behavior, payment records, reconciliation, refunds, and related accounting rules will be defined in a separate document. No further payments can be received after an invoice is marked `Paid`.
- `Void` The invoice has been internally cancelled. No payment can be received, but the client can still view and print the invoice.
- `Refunded` The invoice has been manually refunded by a human. This can only be set by senior accountants or the owner (do not worry about this item at this time).

Flow: `Draft` > `Active` > `Paid` for a successful invoice.
`Draft` > `Active` > `Void` for a cancelled invoice.
Draft invoices can be hard deleted from the database. All other statuses cannot.

Invoices can be viewed either online (at `client.whitepointsurvey.com`) or via a PDF print-out.

Invoices should not be updated once they are presented to the client. Draft invoices can change for any reason. Once the invoice is presented to the client, the only way to cancel it should be to void the invoice.

An invoice should automatically be queued for delivery to QuickBooks Online once the status is changed to `active`. Activation must not depend on a single successful QuickBooks request. The local invoice must remain active and immutable while the integration records a pending, successful, or failed sync state. Failed synchronization must be retryable without creating duplicate QuickBooks invoices, and the invoice's QuickBooks invoice ID and sync information must be stored separately from the local `id` and from the `qbo_id` described below.

The `qbo_id` used by phases and linked invoice line items is the local reference to the applicable row in `qbo_customers_projects`. It identifies the local client/project record and is not the QuickBooks invoice transaction ID. If needed, the QuickBooks invoice transaction ID must be stored in a separate field such as `qbo_invoice_id`.

Invoice numbering uses separate company-configured templates for regular invoices and invoice bundles. Each template may use YY or YYYY, MM, and one or more # sequence characters, must comply with the yearly-reset rules when enabled, and must render to no more than 15 characters. The invoice and bundle sequences remain separate, and bundle numbers must not collide with regular invoice numbers.

## Invoice Bundles
`Invoice Bundles` are wrappers around groups of `invoices`. They can only be created for one `client`, but can contain `n` invoices from that client's projects.

The purpose of invoice bundles is to allow one payment portal for multiple projects.
- Invoice A: $600.00
- Invoice B: $250.00
- Invoice C: $175.00
- Invoice Bundle A, containing Invoice A, B, and C: $1,025.00

Invoice bundles cannot be split by the client. They present one lump-sum payment option for the included invoices. When the bundle receives payment, the payment is recorded against every included invoice. Payment behavior and accounting details will be defined in the separate payments document.

Invoice bundles can only be created from `Draft` invoices. Invoices that are `Active` cannot be incorporated into a new bundle. When a bundle becomes `Active`, all included invoices become `Active` as part of the same operation. Each invoice retains its own invoice number, QuickBooks synchronization, and invoice status for accounting and reporting. The bundle is not a replacement for the individual invoices and does not create a second QuickBooks invoice unless separately specified.

After a bundle becomes `Active`, the included invoices cannot be independently voided or marked `Paid`; those actions must be performed through the bundle workflow so that the bundle and all included invoices remain consistent. Draft bundles and their draft invoices may be modified or deleted according to the draft rules.

The cover of the Invoice Bundle will include:
- Our name, logo, address, and telephone number.
- The word `INVOICE BUNDLE` along with a specific and unique invoice bundle ID. The invoice bundle ID should be different from a regular invoice ID.
- The client's name, project manager / contact person, and address.
- A create date and due date.
- Line items with `Project Name`, `Purchase Order`, and `Invoice Amount`.
- A summary of costs, together with a `payment received` field, if needed.
- A large `TOTAL:` field.
- If the invoice bundle is `void` or `paid`, it should clearly state as such.
- A link to the payment site if being viewed digitally.

Each PDF invoice bundle will include a copy of each invoice included. The only difference is the individual invoice will not have a `pay online` button or link.

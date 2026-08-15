-- Local-only v2 invoice schema smoke test.
-- Run after applying the local Northstar migrations; the fixture uses reserved
-- IDs and cleans itself up when the checks finish.
INSERT INTO qbo_customers_projects (qbo_id, parent_id, display_name, active, last_synced_date)
VALUES ('smoke-client', NULL, 'Smoke Client', 1, '2026-01-01T00:00:00.000Z');
INSERT INTO qbo_customers_projects (qbo_id, parent_id, display_name, active, last_synced_date)
VALUES ('smoke-project', 'smoke-client', 'Smoke Project', 1, '2026-01-01T00:00:00.000Z');
INSERT INTO project_extra_data (qbo_id, status, purchase_order)
VALUES ('smoke-project', 'active', 'PO-SMOKE-001');
INSERT INTO phases (
  id, qbo_id, phase_id, name, bill_type, active, billable, contract_cents,
  retainer_cents, billed_cents, income_cents, created_time, created_id
)
VALUES (900001, 'smoke-project', 'A', 'Smoke Phase', 'fixed-fee', 1, 1, 10000, 0, 0, 0, '2026-01-01T00:00:00.000Z', 'smoke');

INSERT INTO invoices (
  id, qbo_customer_id, qbo_project_id, invoice_number, status, due_type, due_date,
  purchase_order, client_name, project_name, subtotal_cents, total_cents,
  created_time, created_id, activated_time
)
VALUES (
  900001, 'smoke-client', 'smoke-project', 'SMOKE-2026-01', 'active', 'dueOnReceipt',
  '2026-01-15T00:00:00.000Z', 'PO-SMOKE-001', 'Smoke Client', 'Smoke Project',
  2500, 2500, '2026-01-15T00:00:00.000Z', 'smoke', '2026-01-15T00:00:00.000Z'
);

INSERT INTO invoice_line_items (
  invoice_id, qbo_id, phase_id, line_type, phase_path, phase_identifier,
  phase_name, description, contract_cents, prior_billed_cents,
  cumulative_billed_cents, percent_complete, amount_cents, created_time, created_id
)
VALUES (
  900001, 'smoke-project', 900001, 'billable', 'A', 'A', 'Smoke Phase',
  'Smoke Phase', 10000, 0, 2500, 25, 2500, '2026-01-15T00:00:00.000Z', 'smoke'
);

INSERT INTO invoice_bundles (
  id, qbo_customer_id, bundle_number, status, due_type, due_date, client_name,
  subtotal_cents, total_cents, created_time, created_id
)
VALUES (900001, 'smoke-client', 'B-SMOKE-01', 'draft', 'dueOnReceipt', NULL, 'Smoke Client', 2500, 2500, '2026-01-15T00:00:00.000Z', 'smoke');

INSERT INTO invoice_bundle_items (bundle_id, invoice_id, created_time, created_id)
VALUES (900001, 900001, '2026-01-15T00:00:00.000Z', 'smoke');

SELECT CASE WHEN EXISTS (
  SELECT 1 FROM invoices invoice
  JOIN invoice_line_items line ON line.invoice_id = invoice.id
  JOIN invoice_bundles bundle ON bundle.id = 900001
  JOIN invoice_bundle_items item ON item.bundle_id = bundle.id AND item.invoice_id = invoice.id
  JOIN project_extra_data project ON project.qbo_id = invoice.qbo_project_id
  WHERE invoice.purchase_order = project.purchase_order
    AND invoice.due_type = 'dueOnReceipt'
    AND invoice.due_date = invoice.activated_time
    AND line.line_type = 'billable'
) THEN 'PASS: invoice snapshot, bundle membership, purchase order, and due-on-receipt linkage' ELSE 'FAIL' END AS smoke_result;

DELETE FROM invoice_bundle_items WHERE bundle_id = 900001;
DELETE FROM invoice_line_items WHERE invoice_id = 900001;
DELETE FROM invoice_bundles WHERE id = 900001;
DELETE FROM invoices WHERE id = 900001;
DELETE FROM phases WHERE id = 900001;
DELETE FROM project_extra_data WHERE qbo_id = 'smoke-project';
DELETE FROM qbo_customers_projects WHERE qbo_id IN ('smoke-project', 'smoke-client');

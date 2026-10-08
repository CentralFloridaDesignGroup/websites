-- Schema setup and snapshot repairs previously ran during Worker requests.
-- The snapshot migration already owns the table definitions; this migration runs
-- the remaining data repair once and adds indexes for the invoice read paths.

UPDATE invoices
SET
  billing_client_name = COALESCE(NULLIF(billing_client_name, ''), client_name),
  billing_email = COALESCE(NULLIF(billing_email, ''), client_email)
WHERE billing_client_name IS NULL OR billing_client_name = '' OR billing_email IS NULL OR billing_email = '';

UPDATE invoices
SET
  billing_client_name = COALESCE((SELECT display_name FROM qbo_customers WHERE qbo_customers.qbo_id = invoices.qbo_customer_id), billing_client_name, client_name),
  billing_email = COALESCE(NULLIF(billing_email, ''), client_email),
  billing_address_line1 = COALESCE((SELECT bill_addr_line1 FROM qbo_customers WHERE qbo_customers.qbo_id = invoices.qbo_customer_id), billing_address_line1),
  billing_address_line2 = COALESCE((SELECT bill_addr_line2 FROM qbo_customers WHERE qbo_customers.qbo_id = invoices.qbo_customer_id), billing_address_line2),
  billing_address_city = COALESCE((SELECT bill_addr_city FROM qbo_customers WHERE qbo_customers.qbo_id = invoices.qbo_customer_id), billing_address_city),
  billing_address_state = COALESCE((SELECT bill_addr_state FROM qbo_customers WHERE qbo_customers.qbo_id = invoices.qbo_customer_id), billing_address_state),
  billing_address_postal_code = COALESCE((SELECT bill_addr_postal_code FROM qbo_customers WHERE qbo_customers.qbo_id = invoices.qbo_customer_id), billing_address_postal_code)
WHERE qbo_customer_id IS NOT NULL AND qbo_customer_id != '';

UPDATE invoices
SET
  project_address_line1 = COALESCE(NULLIF((SELECT COALESCE(NULLIF(ship_addr_line1, ''), bill_addr_line1) FROM qbo_customers WHERE qbo_customers.qbo_id = invoices.qbo_project_id), ''), project_address_line1),
  project_address_line2 = COALESCE(NULLIF((SELECT COALESCE(NULLIF(ship_addr_line2, ''), bill_addr_line2) FROM qbo_customers WHERE qbo_customers.qbo_id = invoices.qbo_project_id), ''), project_address_line2),
  project_address_city = COALESCE(NULLIF((SELECT COALESCE(NULLIF(ship_addr_city, ''), bill_addr_city) FROM qbo_customers WHERE qbo_customers.qbo_id = invoices.qbo_project_id), ''), project_address_city),
  project_address_state = COALESCE(NULLIF((SELECT COALESCE(NULLIF(ship_addr_state, ''), bill_addr_state) FROM qbo_customers WHERE qbo_customers.qbo_id = invoices.qbo_project_id), ''), project_address_state),
  project_address_postal_code = COALESCE(NULLIF((SELECT COALESCE(NULLIF(ship_addr_postal_code, ''), bill_addr_postal_code) FROM qbo_customers WHERE qbo_customers.qbo_id = invoices.qbo_project_id), ''), project_address_postal_code)
WHERE qbo_project_id IS NOT NULL AND qbo_project_id != ''
  AND (
    project_address_line1 IS NULL OR project_address_line1 = ''
    OR project_address_city IS NULL OR project_address_city = ''
    OR project_address_state IS NULL OR project_address_state = ''
    OR project_address_postal_code IS NULL OR project_address_postal_code = ''
  );

INSERT OR IGNORE INTO project_lifecycle (qbo_project_id, status, updated_date, updated_by)
SELECT qbo_id, CASE WHEN active = 1 THEN 'active' ELSE 'complete' END, CURRENT_TIMESTAMP, 'migration'
FROM qbo_customers
WHERE parent_id IS NOT NULL AND parent_id != '';

CREATE INDEX IF NOT EXISTS idx_invoices_created_date ON invoices(created_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status_created_date ON invoices(status, created_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_project_created_date ON invoices(qbo_project_id, created_date DESC);

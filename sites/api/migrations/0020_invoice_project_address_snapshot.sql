ALTER TABLE invoices ADD COLUMN project_address_line1 TEXT;
ALTER TABLE invoices ADD COLUMN project_address_line2 TEXT;
ALTER TABLE invoices ADD COLUMN project_address_city TEXT;
ALTER TABLE invoices ADD COLUMN project_address_state TEXT;
ALTER TABLE invoices ADD COLUMN project_address_postal_code TEXT;

UPDATE invoices
SET
  project_address_line1 = COALESCE(NULLIF((SELECT COALESCE(NULLIF(ship_addr_line1, ''), bill_addr_line1) FROM qbo_customers WHERE qbo_customers.qbo_id = invoices.qbo_project_id), ''), project_address_line1),
  project_address_line2 = COALESCE(NULLIF((SELECT COALESCE(NULLIF(ship_addr_line2, ''), bill_addr_line2) FROM qbo_customers WHERE qbo_customers.qbo_id = invoices.qbo_project_id), ''), project_address_line2),
  project_address_city = COALESCE(NULLIF((SELECT COALESCE(NULLIF(ship_addr_city, ''), bill_addr_city) FROM qbo_customers WHERE qbo_customers.qbo_id = invoices.qbo_project_id), ''), project_address_city),
  project_address_state = COALESCE(NULLIF((SELECT COALESCE(NULLIF(ship_addr_state, ''), bill_addr_state) FROM qbo_customers WHERE qbo_customers.qbo_id = invoices.qbo_project_id), ''), project_address_state),
  project_address_postal_code = COALESCE(NULLIF((SELECT COALESCE(NULLIF(ship_addr_postal_code, ''), bill_addr_postal_code) FROM qbo_customers WHERE qbo_customers.qbo_id = invoices.qbo_project_id), ''), project_address_postal_code)
WHERE qbo_project_id IS NOT NULL AND qbo_project_id != '';

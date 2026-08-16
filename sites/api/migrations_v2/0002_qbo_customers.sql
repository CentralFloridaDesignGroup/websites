CREATE TABLE IF NOT EXISTS qbo_customers (
	qbo_id TEXT PRIMARY KEY,
	parent_id TEXT CONSTRAINT fk_parent_id REFERENCES qbo_customers(qbo_id) ON DELETE CASCADE,
    display_name TEXT NOT NULL DEFAULT "",
	fully_qualified_name TEXT UNIQUE NOT NULL DEFAULT "", -- This is the name that QuickBooks uses to identify the customer. It is unique across all customers and sub-customers. Will act as a check for duplicates when creating new customers and projects.
	bill_addr_line1 TEXT NOT NULL DEFAULT "",
	bill_addr_line2 TEXT NOT NULL DEFAULT "",
	bill_addr_city TEXT NOT NULL DEFAULT "",
	bill_addr_state TEXT NOT NULL DEFAULT "",
	bill_addr_postal_code TEXT NOT NULL DEFAULT "",
	ship_addr_line1 TEXT NOT NULL DEFAULT "",
	ship_addr_line2 TEXT NOT NULL DEFAULT "",
	ship_addr_city TEXT NOT NULL DEFAULT "",
	ship_addr_state TEXT NOT NULL DEFAULT "",
	ship_addr_postal_code TEXT NOT NULL DEFAULT "",
	active INTEGER NOT NULL DEFAULT 1, 
	sync_token TEXT, 
	qbo_updated_time DATETIME NOT NULL DEFAULT '', 
	last_synced_date DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_qbo_customers_parent_id ON qbo_customers(parent_id);
CREATE INDEX IF NOT EXISTS idx_qbo_customers_active ON qbo_customers(active);

CREATE TABLE IF NOT EXISTS qbo_oauth_states (
  state TEXT PRIMARY KEY,
  return_path TEXT,
  created_date DATETIME NOT NULL
);
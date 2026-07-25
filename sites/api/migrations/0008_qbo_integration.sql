CREATE TABLE IF NOT EXISTS qbo_connection (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  realm_id TEXT NOT NULL,
  environment TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_date DATETIME NOT NULL,
  refresh_expires_date DATETIME,
  last_customer_sync_date DATETIME,
  connected_date DATETIME NOT NULL,
  updated_date DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS qbo_oauth_states (
  state TEXT PRIMARY KEY,
  return_path TEXT,
  created_date DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS qbo_customers (
  qbo_id TEXT PRIMARY KEY,
  parent_id TEXT,
  display_name TEXT NOT NULL,
  fully_qualified_name TEXT,
  company_name TEXT,
  given_name TEXT,
  family_name TEXT,
  primary_email TEXT,
  primary_phone TEXT,
  bill_addr_line1 TEXT,
  bill_addr_line2 TEXT,
  bill_addr_city TEXT,
  bill_addr_state TEXT,
  bill_addr_postal_code TEXT,
  ship_addr_line1 TEXT,
  ship_addr_line2 TEXT,
  ship_addr_city TEXT,
  ship_addr_state TEXT,
  ship_addr_postal_code TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  sync_token TEXT,
  qbo_updated_time DATETIME,
  last_synced_date DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_qbo_customers_parent_id ON qbo_customers(parent_id);
CREATE INDEX IF NOT EXISTS idx_qbo_customers_display_name ON qbo_customers(display_name);
CREATE INDEX IF NOT EXISTS idx_qbo_customers_primary_email ON qbo_customers(primary_email);


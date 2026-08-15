CREATE TABLE IF NOT EXISTS client_contacts (
  id INTEGER PRIMARY KEY,
  qbo_customer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  point_of_contact INTEGER NOT NULL DEFAULT 0,
  receive_invoices INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_date DATETIME NOT NULL,
  updated_date DATETIME NOT NULL,
  CONSTRAINT fk_client_contacts_customer FOREIGN KEY (qbo_customer_id) REFERENCES qbo_customers_projects(qbo_id)
);

CREATE INDEX IF NOT EXISTS idx_client_contacts_customer ON client_contacts(qbo_customer_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_active ON client_contacts(qbo_customer_id, active);

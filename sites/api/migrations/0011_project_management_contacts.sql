CREATE TABLE IF NOT EXISTS client_contacts (
  id INTEGER PRIMARY KEY,
  qbo_customer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT,
  is_invoice_recipient INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_date DATETIME NOT NULL,
  updated_date DATETIME,
  created_by TEXT NOT NULL,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS invoice_contact_recipients (
  id INTEGER PRIMARY KEY,
  invoice_id INTEGER NOT NULL,
  contact_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES client_contacts(id)
);

CREATE TABLE IF NOT EXISTS project_managers (
  qbo_project_id TEXT PRIMARY KEY,
  manager_name TEXT NOT NULL,
  manager_email TEXT NOT NULL,
  updated_date DATETIME NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_client_contacts_qbo_customer_id ON client_contacts(qbo_customer_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_email ON client_contacts(email);
CREATE INDEX IF NOT EXISTS idx_invoice_contact_recipients_invoice_id ON invoice_contact_recipients(invoice_id);
CREATE INDEX IF NOT EXISTS idx_project_managers_email ON project_managers(manager_email);

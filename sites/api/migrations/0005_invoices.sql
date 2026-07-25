CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft',
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  project_reference TEXT,
  issue_date DATE NOT NULL,
  due_date DATE,
  notes TEXT,
  internal_note TEXT,
  public_token TEXT NOT NULL UNIQUE,
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  paid_date DATETIME,
  sent_date DATETIME,
  void_date DATETIME,
  created_date DATETIME NOT NULL,
  updated_date DATETIME,
  created_by TEXT NOT NULL,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id INTEGER PRIMARY KEY,
  invoice_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit_amount_cents INTEGER NOT NULL DEFAULT 0,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_client_email ON invoices(client_email);
CREATE INDEX IF NOT EXISTS idx_invoices_public_token ON invoices(public_token);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_checkout_session_id ON invoices(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_payment_intent_id ON invoices(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);

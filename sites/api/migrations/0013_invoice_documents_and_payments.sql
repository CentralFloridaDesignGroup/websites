CREATE TABLE IF NOT EXISTS project_billing_profiles (
  qbo_project_id TEXT PRIMARY KEY,
  po_number TEXT,
  invoice_document_note TEXT,
  updated_date DATETIME NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_invoice_documents (
  id INTEGER PRIMARY KEY,
  qbo_project_id TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_date DATETIME NOT NULL,
  created_by TEXT NOT NULL,
  updated_date DATETIME,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS invoice_payments (
  id INTEGER PRIMARY KEY,
  invoice_id INTEGER NOT NULL,
  kind TEXT NOT NULL DEFAULT 'payment',
  status TEXT NOT NULL DEFAULT 'succeeded',
  method TEXT NOT NULL,
  gross_cents INTEGER NOT NULL DEFAULT 0,
  fee_cents INTEGER NOT NULL DEFAULT 0,
  net_cents INTEGER NOT NULL DEFAULT 0,
  paid_date DATETIME NOT NULL,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  stripe_balance_transaction_id TEXT,
  qbo_payment_id TEXT,
  qbo_deposit_id TEXT,
  qbo_sync_status TEXT,
  qbo_sync_message TEXT,
  qbo_last_sync_date DATETIME,
  note TEXT,
  created_date DATETIME NOT NULL,
  updated_date DATETIME,
  created_by TEXT NOT NULL,
  updated_by TEXT,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_invoice_documents_project_id ON project_invoice_documents(qbo_project_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_stripe_session ON invoice_payments(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_stripe_intent ON invoice_payments(stripe_payment_intent_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_payments_unique_stripe_session
  ON invoice_payments(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL AND stripe_checkout_session_id != '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_payments_unique_stripe_intent
  ON invoice_payments(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL AND stripe_payment_intent_id != '';

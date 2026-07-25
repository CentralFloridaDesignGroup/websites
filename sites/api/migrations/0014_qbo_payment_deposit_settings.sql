CREATE TABLE IF NOT EXISTS qbo_accounts (
  qbo_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  fully_qualified_name TEXT,
  account_type TEXT,
  account_sub_type TEXT,
  classification TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  sync_token TEXT,
  qbo_updated_time DATETIME,
  last_synced_date DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_qbo_accounts_name ON qbo_accounts(name);
CREATE INDEX IF NOT EXISTS idx_qbo_accounts_account_type ON qbo_accounts(account_type);

-- Runtime schema guards add qbo_connection and invoice_payments columns idempotently.
SELECT 1;

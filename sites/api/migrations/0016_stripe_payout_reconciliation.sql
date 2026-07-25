ALTER TABLE invoice_payments ADD COLUMN stripe_payout_id TEXT;
ALTER TABLE invoice_payments ADD COLUMN stripe_payout_status TEXT;
ALTER TABLE invoice_payments ADD COLUMN stripe_payout_reconciled_date DATETIME;

CREATE TABLE IF NOT EXISTS stripe_payouts (
  stripe_payout_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  arrival_date DATETIME,
  paid_date DATETIME,
  reconciled_date DATETIME,
  qbo_deposit_id TEXT,
  qbo_sync_status TEXT,
  qbo_sync_message TEXT,
  qbo_last_sync_date DATETIME,
  email_sent_date DATETIME,
  created_date DATETIME NOT NULL,
  updated_date DATETIME
);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_stripe_balance_transaction ON invoice_payments(stripe_balance_transaction_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_stripe_payout ON invoice_payments(stripe_payout_id);

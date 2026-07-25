ALTER TABLE invoices ADD COLUMN accounting_sync_state TEXT;
ALTER TABLE invoice_payments ADD COLUMN accounting_sync_state TEXT;
ALTER TABLE stripe_payouts ADD COLUMN accounting_sync_state TEXT;

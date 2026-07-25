-- The invoices API adds po_number with an idempotent runtime schema guard.
-- D1/SQLite does not support ADD COLUMN IF NOT EXISTS, so this migration is
-- intentionally a marker to avoid duplicate-column failures in environments
-- where the guard has already run.
SELECT 1;

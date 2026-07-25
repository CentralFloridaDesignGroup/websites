-- The invoices API adds progress-billing columns with an idempotent runtime
-- schema guard. D1/SQLite does not support ADD COLUMN IF NOT EXISTS, so this
-- marker avoids duplicate-column failures when the guard has already run.
SELECT 1;

-- The API runtime schema guard already adds invoice_line_items.bill_in_full
-- when needed. Keep this migration as a no-op for databases where the guard
-- created the column before the migration ran.
SELECT 1;

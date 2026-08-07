CREATE TABLE IF NOT EXISTS project_tasks (
  id INTEGER PRIMARY KEY,
  qbo_project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  scope_of_work TEXT NOT NULL DEFAULT '',
  contract_amount_cents INTEGER NOT NULL DEFAULT 0,
  retainer_cents INTEGER NOT NULL DEFAULT 0,
  price_type TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_date DATETIME NOT NULL,
  updated_date DATETIME NOT NULL,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  FOREIGN KEY (qbo_project_id) REFERENCES qbo_customers(qbo_id)
);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_active ON project_tasks(qbo_project_id, active, sort_order);
-- invoice_line_items.project_task_id is added by the API runtime schema guard,
-- matching the existing bill_in_full migration pattern.
SELECT 1;

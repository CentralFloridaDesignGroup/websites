CREATE TABLE IF NOT EXISTS project_lifecycle (
  qbo_project_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('proposal', 'active', 'hold', 'complete', 'cancelled')),
  updated_date DATETIME NOT NULL,
  updated_by TEXT NOT NULL,
  FOREIGN KEY (qbo_project_id) REFERENCES qbo_customers(qbo_id)
);

INSERT OR IGNORE INTO project_lifecycle (qbo_project_id, status, updated_date, updated_by)
SELECT
  qbo_id,
  CASE WHEN active = 1 THEN 'active' ELSE 'complete' END,
  CURRENT_TIMESTAMP,
  'migration'
FROM qbo_customers
WHERE parent_id IS NOT NULL AND parent_id != '';

CREATE INDEX IF NOT EXISTS idx_project_lifecycle_status ON project_lifecycle(status);

BEGIN TRANSACTION;

-- Keep one internal status row for each cached QBO client/project. Invalid and
-- duplicate rows are removed before the unique indexes are created.
DELETE FROM client_extra_data
WHERE qbo_id IS NULL
   OR TRIM(qbo_id) = ''
   OR id NOT IN (
     SELECT MAX(id)
     FROM client_extra_data
     WHERE qbo_id IS NOT NULL AND TRIM(qbo_id) <> ''
     GROUP BY qbo_id
   );

DELETE FROM project_extra_data
WHERE qbo_id IS NULL
   OR TRIM(qbo_id) = ''
   OR id NOT IN (
     SELECT MAX(id)
     FROM project_extra_data
     WHERE qbo_id IS NOT NULL AND TRIM(qbo_id) <> ''
     GROUP BY qbo_id
   );

INSERT INTO client_extra_data (qbo_id, status)
SELECT qbo_id, 'active'
FROM qbo_customers_projects
WHERE (parent_id IS NULL OR TRIM(parent_id) = '')
  AND NOT EXISTS (
    SELECT 1 FROM client_extra_data extra WHERE extra.qbo_id = qbo_customers_projects.qbo_id
  );

INSERT INTO project_extra_data (qbo_id, status)
SELECT qbo_id, 'active'
FROM qbo_customers_projects
WHERE parent_id IS NOT NULL AND TRIM(parent_id) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM project_extra_data extra WHERE extra.qbo_id = qbo_customers_projects.qbo_id
  );

UPDATE client_extra_data
SET status = 'active'
WHERE status IS NULL OR TRIM(status) = '';

UPDATE project_extra_data
SET status = 'active'
WHERE status IS NULL OR TRIM(status) = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_extra_data_qbo_id_unique
  ON client_extra_data(qbo_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_extra_data_qbo_id_unique
  ON project_extra_data(qbo_id);
CREATE INDEX IF NOT EXISTS idx_qbo_customers_projects_client_name
  ON qbo_customers_projects(parent_id, display_name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_qbo_customers_projects_full_name
  ON qbo_customers_projects(display_name COLLATE NOCASE, fully_qualified_name COLLATE NOCASE);

COMMIT;

CREATE TABLE IF NOT EXISTS project_contact_assignments (
  project_id TEXT NOT NULL,
  contact_id INTEGER NOT NULL,
  created_date DATETIME NOT NULL,
  created_id TEXT NOT NULL,
  PRIMARY KEY (project_id, contact_id),
  CONSTRAINT fk_project_contact_project FOREIGN KEY (project_id) REFERENCES qbo_customers_projects(qbo_id),
  CONSTRAINT fk_project_contact_contact FOREIGN KEY (contact_id) REFERENCES client_contacts(id)
);

CREATE INDEX IF NOT EXISTS idx_project_contact_assignments_contact ON project_contact_assignments(contact_id);

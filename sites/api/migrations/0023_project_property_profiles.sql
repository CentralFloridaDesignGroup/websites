CREATE TABLE IF NOT EXISTS project_property_profiles (
  qbo_project_id TEXT PRIMARY KEY,
  parcel_id TEXT NOT NULL DEFAULT '',
  updated_date DATETIME NOT NULL,
  updated_by TEXT NOT NULL,
  FOREIGN KEY (qbo_project_id) REFERENCES qbo_customers(qbo_id)
);

CREATE INDEX IF NOT EXISTS idx_project_property_profiles_parcel_id ON project_property_profiles(parcel_id);

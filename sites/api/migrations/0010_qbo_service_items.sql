CREATE TABLE IF NOT EXISTS qbo_service_items (
  qbo_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  fully_qualified_name TEXT,
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  sync_token TEXT,
  qbo_updated_time DATETIME,
  last_synced_date DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_qbo_service_items_name ON qbo_service_items(name);


-- Creates the `client-files`, `client-extra-data`, and `client-contacts` tables, along with the necessary indexes and constraints.

CREATE TABLE IF NOT EXISTS client_files (
	id INTEGER PRIMARY KEY,
	qbo_id TEXT NOT NULL CONSTRAINT fk_qbo_id REFERENCES qbo_customers(qbo_id) ON DELETE CASCADE,
	r2_key TEXT NOT NULL,
	filename TEXT NOT NULL,
	description TEXT,
	content_type TEXT NOT NULL,
	size_bytes INTEGER NOT NULL CONSTRAINT check_size_bytes CHECK (size_bytes >= 0),
	active INTEGER NOT NULL DEFAULT 1 CONSTRAINT check_active CHECK (active IN (0, 1)),
	created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_time DATETIME,
	created_id TEXT NOT NULL,
	updated_id TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_client_files_active ON client_files(active);
CREATE INDEX IF NOT EXISTS idx_client_files_qbo_id ON client_files(qbo_id);
CREATE INDEX IF NOT EXISTS idx_client_files_qbo_id_active ON client_files(qbo_id, active);

CREATE TABLE IF NOT EXISTS client_extra_data (
	id INTEGER PRIMARY KEY,
	qbo_id TEXT NOT NULL CONSTRAINT fk_qbo_id REFERENCES qbo_customers(qbo_id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT "active" CONSTRAINT check_status CHECK (status IN ("active", "inactive", "suspended", "prospect", "archived"))
);

CREATE INDEX IF NOT EXISTS idx_client_extra_data_qbo_id ON client_extra_data (qbo_id);
CREATE INDEX IF NOT EXISTS idx_client_extra_data_status ON client_extra_data (status);

CREATE TABLE IF NOT EXISTS client_contacts (
  id INTEGER PRIMARY KEY,
  qbo_id TEXT NOT NULL CONSTRAINT fk_qbo_id REFERENCES qbo_customers(qbo_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL DEFAULT '',
  point_of_contact INTEGER NOT NULL DEFAULT 0 CONSTRAINT check_point_of_contact CHECK (point_of_contact IN (0, 1)),
  receive_invoices INTEGER NOT NULL DEFAULT 0 CONSTRAINT check_receive_invoices CHECK (receive_invoices IN (0, 1)),
  active INTEGER NOT NULL DEFAULT 1 CONSTRAINT check_active CHECK (active IN (0, 1)),
  created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_date DATETIME NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_client_contacts_customer ON client_contacts(qbo_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_active ON client_contacts(active);
CREATE INDEX IF NOT EXISTS idx_client_contacts_point_of_contact ON client_contacts(point_of_contact);
CREATE INDEX IF NOT EXISTS idx_client_contacts_receive_invoices ON client_contacts(receive_invoices);

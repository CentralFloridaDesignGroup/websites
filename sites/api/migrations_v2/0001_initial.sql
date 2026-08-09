BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS qbo_oauth_states (
  state TEXT PRIMARY KEY,
  return_path TEXT,
  created_date DATETIME NOT NULL
);
-- Base table for QBO customers and projects. This table is used to store the basic information about customers and projects from QuickBooks Online. Referenced by other tables for additional data.
CREATE TABLE IF NOT EXISTS qbo_customers_projects (
	qbo_id TEXT PRIMARY KEY,
	parent_id TEXT,
    display_name TEXT,
	fully_qualified_name TEXT,
	company_name TEXT, 
	given_name TEXT, 
	family_name TEXT, 
	primary_email TEXT, 
	primary_phone TEXT, 
	bill_addr_line1 TEXT,
	bill_addr_line2 TEXT,
	bill_addr_city TEXT, 
	bill_addr_state TEXT, 
	bill_addr_postal_code TEXT, 
	ship_addr_line1 TEXT, 
	ship_addr_line2 TEXT, 
	ship_addr_city TEXT, 
	ship_addr_state TEXT, 
	ship_addr_postal_code TEXT, 
	active INTEGER NOT NULL DEFAULT 1, 
	sync_token TEXT, 
	qbo_updated_time DATETIME, 
	last_synced_date DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS client_files (
	id INTEGER PRIMARY KEY,
	qbo_id TEXT,
	r2_key TEXT,
	filename TEXT,
	description TEXT,
	content_type TEXT,
	size_bytes INTEGER,
	active INTEGER,
	created_time DATETIME,
	updated_time DATETIME,
	created_id TEXT,
	updated_id TEXT,
	CONSTRAINT fk_qbo_id FOREIGN KEY (qbo_id) REFERENCES qbo_customers_projects(qbo_id)
);
CREATE TABLE IF NOT EXISTS client_extra_data (
	id INTEGER PRIMARY KEY,
	qbo_id TEXT NOT NULL,
	contacts TEXT,
	geolocation TEXT, status TEXT,
	CONSTRAINT fk_qbo_id FOREIGN KEY (qbo_id) REFERENCES qbo_customers_projects(qbo_id)
);
CREATE TABLE IF NOT EXISTS company_settings (
	id INTEGER PRIMARY KEY,
	general_settings TEXT,
	qbo_settings TEXT
);
CREATE TABLE IF NOT EXISTS project_files (
	id INTEGER PRIMARY KEY,
	qbo_id TEXT,
	r2_key TEXT,
	filename TEXT,
	description TEXT,
	content_type TEXT,
	size_bytes INTEGER,
	active INTEGER,
	created_time DATETIME,
	updated_time DATETIME,
	created_id TEXT,
	updated_id TEXT,
	CONSTRAINT fk_qbo_id FOREIGN KEY (qbo_id) REFERENCES qbo_customers_projects(qbo_id)
);
CREATE TABLE IF NOT EXISTS project_extra_data (
	id INTEGER PRIMARY KEY,
	qbo_id TEXT,
	status TEXT,
	project_manager TEXT,
	parcel_id TEXT,
	geolocation TEXT,
	CONSTRAINT fk_qbo_id FOREIGN KEY (qbo_id) REFERENCES qbo_customers_projects(qbo_id)
);
CREATE TABLE IF NOT EXISTS project_phases (
    id INTEGER PRIMARY KEY,
    qbo_id TEXT,
    name TEXT,
    description TEXT,
    bill_type TEXT,
    status TEXT,
    contract_cents INTEGER,
    billed_percent TEXT,
    billed_cents INTEGER,
    paid_percent TEXT,
    paid_cents INTEGER,
    created_time DATETIME,
    updated_time DATETIME,
    created_id TEXT,
    updated_id TEXT,
    CONSTRAINT fk_qbo_id FOREIGN KEY (qbo_id) REFERENCES qbo_customers_projects(qbo_id)
);
CREATE TABLE IF NOT EXISTS record_ledger (
	id INTEGER PRIMARY KEY,
	-- Reference ID to subject table. Not FK'ed because it can be any table.
	ref_id INTEGER,
	-- Function is how we identify what table was affected
	function TEXT,
	-- Message for the log entry
	message TEXT,
	log_date DATETIME,
	log_user TEXT
);
CREATE INDEX IF NOT EXISTS idx_client_files_active ON client_files(active);
CREATE INDEX IF NOT EXISTS idx_client_files_qbo_id ON client_files(qbo_id);
CREATE INDEX IF NOT EXISTS idx_client_files_qbo_id_active ON client_files(qbo_id, active);
CREATE INDEX IF NOT EXISTS idx_client_extra_data_qbo_id ON client_extra_data (qbo_id);
CREATE INDEX IF NOT EXISTS idx_company_settings_id ON company_settings (id);
CREATE INDEX IF NOT EXISTS idx_project_files_active ON project_files(active);
CREATE INDEX IF NOT EXISTS idx_project_files_qbo_id ON project_files(qbo_id);
CREATE INDEX IF NOT EXISTS idx_project_files_qbo_id_active ON project_files(qbo_id, active);
CREATE INDEX IF NOT EXISTS idx_project_extra_data_project_manager ON project_extra_data(project_manager);
CREATE INDEX IF NOT EXISTS idx_project_extra_data_status ON project_extra_data(status);
CREATE INDEX IF NOT EXISTS idx_record_ledger_log_user ON record_ledger(log_user);
CREATE INDEX IF NOT EXISTS idx_record_ledger_ref_id ON record_ledger(ref_id);
CREATE INDEX IF NOT EXISTS idx_record_ledger_function ON record_ledger(function);
CREATE INDEX IF NOT EXISTS idx_project_phases_qbo_id ON project_phases(qbo_id);
CREATE INDEX IF NOT EXISTS idx_project_phases_qbo_id_status ON project_phases(qbo_id, status); --Index for filtering by qbo_id and status
CREATE INDEX IF NOT EXISTS idx_project_phases_bill_type ON project_phases(bill_type); --Index for filtering by bill_type

--for now, create a company_settings row with id=1 to hold the QBO settings blob. This will be updated later when the user connects to QBO.
INSERT INTO company_settings (id, general_settings, qbo_settings) VALUES (1, '{}', '{}') ON CONFLICT(id) DO NOTHING;
COMMIT;

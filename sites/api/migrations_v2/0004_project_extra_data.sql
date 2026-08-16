CREATE TABLE
    IF NOT EXISTS project_files (
        id INTEGER PRIMARY KEY,
        qbo_id TEXT NOT NULL CONSTRAINT fk_qbo_id REFERENCES qbo_customers (qbo_id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_project_files_active ON project_files (active);
CREATE INDEX IF NOT EXISTS idx_project_files_qbo_id ON project_files (qbo_id);

CREATE TABLE
    IF NOT EXISTS project_extra_data (
        id INTEGER PRIMARY KEY,
        qbo_id TEXT NOT NULL CONSTRAINT fk_qbo_id REFERENCES qbo_customers (qbo_id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT "imported" CONSTRAINT check_status CHECK (
            status IN (
                "proposal",
                "active",
                "inactive",
                "completed",
                "cancelled",
                "hold",
                "imported"
            )
        ),
        purchase_order TEXT DEFAULT '',
        project_manager TEXT DEFAULT '',
        parcel_id TEXT DEFAULT '',
        geolocation TEXT DEFAULT '{}'
    );

CREATE INDEX IF NOT EXISTS idx_project_extra_data_project_manager ON project_extra_data (project_manager);
CREATE INDEX IF NOT EXISTS idx_project_extra_data_status ON project_extra_data (status);

CREATE TABLE IF NOT EXISTS project_contact_assignments (
    id INTEGER PRIMARY KEY,
    project_id TEXT NOT NULL CONSTRAINT fk_project_id REFERENCES qbo_customers(qbo_id) ON DELETE CASCADE,
    contact_id INTEGER NOT NULL CONSTRAINT fk_contact_id REFERENCES client_contacts(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'other' CONSTRAINT check_role CHECK (role IN ('invoicing', 'point_of_contact', 'other')),
    active INTEGER NOT NULL DEFAULT 1 CONSTRAINT check_active CHECK (active IN (0, 1)),
    "primary" INTEGER NOT NULL DEFAULT 0 CONSTRAINT check_primary CHECK ("primary" IN (0, 1)),
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_project_contact_assignments_contact ON project_contact_assignments(contact_id);
CREATE INDEX IF NOT EXISTS idx_project_contact_assignments_project ON project_contact_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_contact_assignments_active ON project_contact_assignments(active);
CREATE INDEX IF NOT EXISTS idx_project_contact_assignments_primary ON project_contact_assignments("primary");

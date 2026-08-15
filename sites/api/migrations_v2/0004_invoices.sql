-- V2 invoices are immutable client-facing billing snapshots. Drafts may be
-- edited; activation snapshots all values needed to render the invoice without
-- reading mutable project, phase, client, or company records.
CREATE TABLE IF NOT EXISTS invoice_number_sequences (
    sequence_key TEXT PRIMARY KEY,
    next_value INTEGER NOT NULL DEFAULT 1 CHECK (next_value > 0)
);

CREATE TABLE IF NOT EXISTS invoice_bundles (
    id INTEGER PRIMARY KEY,
    qbo_customer_id TEXT NOT NULL,
    bundle_number TEXT UNIQUE NOT NULL CHECK (length(bundle_number) BETWEEN 1 AND 15),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paid', 'void', 'refunded')),
    due_type TEXT NOT NULL DEFAULT 'dueOnReceipt' CHECK (due_type IN ('dueOnReceipt', 'net30', 'net45', 'net60', 'payWhenPaid')),
    due_date DATETIME,
    client_name TEXT NOT NULL DEFAULT '',
    client_email TEXT NOT NULL DEFAULT '',
    client_address_line1 TEXT NOT NULL DEFAULT '',
    client_address_line2 TEXT NOT NULL DEFAULT '',
    client_address_city TEXT NOT NULL DEFAULT '',
    client_address_state TEXT NOT NULL DEFAULT '',
    client_address_postal_code TEXT NOT NULL DEFAULT '',
    company_name TEXT NOT NULL DEFAULT '',
    company_logo TEXT NOT NULL DEFAULT '',
    company_address_line1 TEXT NOT NULL DEFAULT '',
    company_address_line2 TEXT NOT NULL DEFAULT '',
    company_address_city TEXT NOT NULL DEFAULT '',
    company_address_state TEXT NOT NULL DEFAULT '',
    company_address_postal_code TEXT NOT NULL DEFAULT '',
    company_phone TEXT NOT NULL DEFAULT '',
    subtotal_cents INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
    total_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
    created_time DATETIME NOT NULL,
    created_id TEXT NOT NULL,
    activated_time DATETIME,
    void_time DATETIME,
    paid_time DATETIME,
    refunded_time DATETIME,
    updated_time DATETIME,
    updated_id TEXT,
    CONSTRAINT fk_qbo_customer_id FOREIGN KEY (qbo_customer_id) REFERENCES qbo_customers_projects(qbo_id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_bundles_qbo_customer_id ON invoice_bundles (qbo_customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_bundles_status ON invoice_bundles (status);
CREATE INDEX IF NOT EXISTS idx_invoice_bundles_created_time ON invoice_bundles (created_time);

CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY,
    qbo_customer_id TEXT NOT NULL,
    qbo_project_id TEXT NOT NULL,
    bundle_id INTEGER,
    invoice_number TEXT UNIQUE NOT NULL CHECK (length(invoice_number) BETWEEN 1 AND 15),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paid', 'void', 'refunded')),
    due_type TEXT NOT NULL DEFAULT 'dueOnReceipt' CHECK (due_type IN ('dueOnReceipt', 'net30', 'net45', 'net60', 'payWhenPaid')),
    due_date DATETIME,
    purchase_order TEXT NOT NULL DEFAULT '',
    client_name TEXT NOT NULL DEFAULT '',
    client_email TEXT NOT NULL DEFAULT '',
    client_address_line1 TEXT NOT NULL DEFAULT '',
    client_address_line2 TEXT NOT NULL DEFAULT '',
    client_address_city TEXT NOT NULL DEFAULT '',
    client_address_state TEXT NOT NULL DEFAULT '',
    client_address_postal_code TEXT NOT NULL DEFAULT '',
    project_name TEXT NOT NULL DEFAULT '',
    project_reference TEXT NOT NULL DEFAULT '',
    project_address_line1 TEXT NOT NULL DEFAULT '',
    project_address_line2 TEXT NOT NULL DEFAULT '',
    project_address_city TEXT NOT NULL DEFAULT '',
    project_address_state TEXT NOT NULL DEFAULT '',
    project_address_postal_code TEXT NOT NULL DEFAULT '',
    project_manager_id TEXT NOT NULL DEFAULT '',
    project_manager_name TEXT NOT NULL DEFAULT '',
    company_name TEXT NOT NULL DEFAULT '',
    company_logo TEXT NOT NULL DEFAULT '',
    company_address_line1 TEXT NOT NULL DEFAULT '',
    company_address_line2 TEXT NOT NULL DEFAULT '',
    company_address_city TEXT NOT NULL DEFAULT '',
    company_address_state TEXT NOT NULL DEFAULT '',
    company_address_postal_code TEXT NOT NULL DEFAULT '',
    company_phone TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    internal_notes TEXT NOT NULL DEFAULT '',
    subtotal_cents INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
    total_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
    created_time DATETIME NOT NULL,
    created_id TEXT NOT NULL,
    activated_time DATETIME,
    void_time DATETIME,
    paid_time DATETIME,
    refunded_time DATETIME,
    updated_time DATETIME,
    updated_id TEXT,
    qbo_invoice_id TEXT,
    qbo_invoice_sync_token TEXT,
    qbo_sync_status TEXT NOT NULL DEFAULT 'notSynced' CHECK (qbo_sync_status IN ('notSynced', 'pending', 'synced', 'failed', 'voidSynced')),
    qbo_sync_message TEXT NOT NULL DEFAULT '',
    qbo_last_sync_time DATETIME,
    CONSTRAINT fk_qbo_customer_id FOREIGN KEY (qbo_customer_id) REFERENCES qbo_customers_projects(qbo_id),
    CONSTRAINT fk_qbo_project_id FOREIGN KEY (qbo_project_id) REFERENCES qbo_customers_projects(qbo_id),
    CONSTRAINT fk_bundle_id FOREIGN KEY (bundle_id) REFERENCES invoice_bundles(id),
    CHECK (qbo_customer_id <> qbo_project_id)
);

CREATE INDEX IF NOT EXISTS idx_invoices_qbo_customer_id ON invoices (qbo_customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_qbo_project_id ON invoices (qbo_project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoices_bundle_id ON invoices (bundle_id);
CREATE INDEX IF NOT EXISTS idx_invoices_qbo_invoice_id ON invoices (qbo_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_time ON invoices (created_time);

CREATE TABLE IF NOT EXISTS invoice_line_items (
    id INTEGER PRIMARY KEY,
    invoice_id INTEGER NOT NULL,
    qbo_id TEXT,
    phase_id INTEGER,
    line_type TEXT NOT NULL CHECK (line_type IN ('billable', 'informational')),
    phase_path TEXT NOT NULL DEFAULT '',
    phase_identifier TEXT NOT NULL DEFAULT '',
    phase_name TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    contract_cents INTEGER NOT NULL DEFAULT 0 CHECK (contract_cents >= 0),
    prior_billed_cents INTEGER NOT NULL DEFAULT 0 CHECK (prior_billed_cents >= 0),
    cumulative_billed_cents INTEGER NOT NULL DEFAULT 0 CHECK (cumulative_billed_cents >= 0),
    percent_complete REAL NOT NULL DEFAULT 0 CHECK (percent_complete >= 0 AND percent_complete <= 100),
    amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
    source_phase_updated_time DATETIME,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_time DATETIME NOT NULL,
    created_id TEXT NOT NULL,
    updated_time DATETIME,
    updated_id TEXT,
    CONSTRAINT fk_invoice_id FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    CONSTRAINT fk_phase_id FOREIGN KEY (phase_id) REFERENCES phases(id),
    CONSTRAINT fk_qbo_id FOREIGN KEY (qbo_id) REFERENCES qbo_customers_projects(qbo_id),
    CHECK (line_type = 'informational' OR phase_id IS NOT NULL OR qbo_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_phase_id ON invoice_line_items (phase_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_qbo_id ON invoice_line_items (qbo_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_type ON invoice_line_items (line_type);
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoice_billable_phase
  ON invoice_line_items (invoice_id, phase_id)
  WHERE line_type = 'billable' AND phase_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS invoice_bundle_items (
    bundle_id INTEGER NOT NULL,
    invoice_id INTEGER NOT NULL UNIQUE,
    created_time DATETIME NOT NULL,
    created_id TEXT NOT NULL,
    PRIMARY KEY (bundle_id, invoice_id),
    CONSTRAINT fk_bundle_items_bundle FOREIGN KEY (bundle_id) REFERENCES invoice_bundles(id),
    CONSTRAINT fk_bundle_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_bundle_items_bundle_id ON invoice_bundle_items (bundle_id);
CREATE INDEX IF NOT EXISTS idx_invoice_bundle_items_invoice_id ON invoice_bundle_items (invoice_id);

-- V2 invoices are immutable client-facing billing snapshots. Drafts may be
-- edited; activation snapshots all values needed to render the invoice without
-- reading mutable project, phase, client, or company records.
CREATE TABLE
    IF NOT EXISTS invoice_bundles (
        id INTEGER PRIMARY KEY,
        qbo_client_id TEXT NOT NULL CONSTRAINT fk_qbo_client_id REFERENCES qbo_customers (qbo_id) ON DELETE CASCADE,
        bundle_id TEXT UNIQUE NOT NULL CHECK (length (bundle_id) BETWEEN 1 AND 15),
        status TEXT NOT NULL DEFAULT 'draft' CHECK (
            status IN ('draft', 'active', 'paid', 'void', 'refunded')
        ),
        payment_term TEXT NOT NULL DEFAULT 'dueOnReceipt' CHECK (
            payment_term IN (
                'dueOnReceipt',
                'net30',
                'net45',
                'net60',
                'payWhenPaid'
            )
        ),
        due_date DATETIME,
        client_information TEXT NOT NULL DEFAULT '{}',
        company_information TEXT NOT NULL DEFAULT '{}',
        subtotal_cents INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
        total_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
        created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_id TEXT NOT NULL,
        activated_time DATETIME,
        closed_time DATETIME,
        updated_time DATETIME,
        updated_id TEXT
    );

CREATE INDEX IF NOT EXISTS idx_invoice_bundles_qbo_client_id ON invoice_bundles (qbo_client_id);

CREATE INDEX IF NOT EXISTS idx_invoice_bundles_status ON invoice_bundles (status);

CREATE INDEX IF NOT EXISTS idx_invoice_bundles_created_time ON invoice_bundles (created_time);

CREATE TABLE
    IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY,
        qbo_client_id TEXT NOT NULL CONSTRAINT fk_qbo_id REFERENCES qbo_customers (qbo_id) ON DELETE CASCADE,
        qbo_project_id TEXT NOT NULL CONSTRAINT fk_qbo_id REFERENCES qbo_customers (qbo_id) ON DELETE CASCADE,
        invoice_id TEXT UNIQUE NOT NULL CHECK (length (invoice_id) BETWEEN 1 AND 15),
        status TEXT NOT NULL DEFAULT 'draft' CHECK (
            status IN ('draft', 'active', 'paid', 'void', 'refunded')
        ),
        payment_term TEXT NOT NULL DEFAULT 'dueOnReceipt' CHECK (
            payment_term IN (
                'dueOnReceipt',
                'net30',
                'net45',
                'net60',
                'payWhenPaid'
            )
        ),
        due_date DATETIME,
        client_info TEXT NOT NULL DEFAULT '{}',
        project_info TEXT NOT NULL DEFAULT '{}',
        company_info TEXT NOT NULL DEFAULT '{}',
        project_manager_id TEXT NOT NULL DEFAULT '',
        project_manager_name TEXT NOT NULL DEFAULT '',
        public_notes TEXT NOT NULL DEFAULT '',
        internal_notes TEXT NOT NULL DEFAULT '',
        subtotal_cents INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
        total_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
        discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
        created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_id TEXT NOT NULL,
        activated_time DATETIME,
        closed_time DATETIME,
        updated_id TEXT,
        qbo_invoice_id TEXT,
        qbo_invoice_sync_token TEXT,
        qbo_sync_status TEXT NOT NULL DEFAULT 'notSynced' CHECK (
            qbo_sync_status IN (
                'notSynced',
                'pending',
                'synced',
                'failed',
                'voidSynced'
            )
        ),
        qbo_sync_message TEXT NOT NULL DEFAULT '',
        qbo_last_sync_time DATETIME,
        CHECK (qbo_client_id <> qbo_project_id)
    );

CREATE INDEX IF NOT EXISTS idx_invoices_qbo_client_id ON invoices (qbo_client_id);

CREATE INDEX IF NOT EXISTS idx_invoices_qbo_project_id ON invoices (qbo_project_id);

CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status);

CREATE TABLE
    IF NOT EXISTS invoice_line_items (
        id INTEGER PRIMARY KEY,
        invoice_id INTEGER NOT NULL CONSTRAINT fk_invoice_id REFERENCES invoices (id) ON DELETE CASCADE,
        phase_id INTEGER,
        line_type TEXT NOT NULL CHECK (line_type IN ('billable', 'informational')),
        phase_path TEXT NOT NULL DEFAULT '',
        phase_identifier TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        contract_cents INTEGER NOT NULL DEFAULT 0 CHECK (contract_cents >= 0),
        prior_billed_cents INTEGER NOT NULL DEFAULT 0 CHECK (prior_billed_cents >= 0),
        cumulative_billed_cents INTEGER NOT NULL DEFAULT 0 CHECK (cumulative_billed_cents >= 0),
        percent_complete REAL NOT NULL DEFAULT 0 CHECK (
            percent_complete >= 0
            AND percent_complete <= 100
        ),
        amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
        source_phase_updated_time DATETIME,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_id TEXT NOT NULL,
        updated_time DATETIME,
        updated_id TEXT,
        CHECK (
            line_type = 'informational'
            OR phase_id IS NOT NULL
        )
    );

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items (invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_phase_id ON invoice_line_items (phase_id);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_type ON invoice_line_items (line_type);

CREATE UNIQUE INDEX IF NOT EXISTS uq_invoice_billable_phase ON invoice_line_items (invoice_id, phase_id)
WHERE
    line_type = 'billable'
    AND phase_id IS NOT NULL;

CREATE TABLE
    IF NOT EXISTS invoice_bundle_items (
        id INTEGER PRIMARY KEY,
        bundle_id INTEGER NOT NULL CONSTRAINT fk_bundle_items_bundle REFERENCES invoice_bundles (id) ON DELETE CASCADE,
        invoice_id INTEGER NOT NULL UNIQUE,
        created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_id TEXT NOT NULL
    );

CREATE INDEX IF NOT EXISTS idx_invoice_bundle_items_bundle_id ON invoice_bundle_items (bundle_id);

CREATE INDEX IF NOT EXISTS idx_invoice_bundle_items_invoice_id ON invoice_bundle_items (invoice_id);
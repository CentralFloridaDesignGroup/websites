CREATE TABLE IF NOT EXISTS phases (
    id INTEGER PRIMARY KEY,
    qbo_id TEXT NOT NULL,
    parent_id INTEGER, -- this is the id of the parent phase, if any
    phase_id TEXT NOT NULL CHECK (length(trim(phase_id)) > 0),
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    description TEXT,
    bill_type TEXT NOT NULL, -- can be 'fixed-fee', 'time-and-materials', 'non-billable'
    active INTEGER NOT NULL DEFAULT 1, -- 0 = inactive, 1 = active
    billable INTEGER NOT NULL DEFAULT 1, -- 0 = non-billable, 1 = billable
    deleted INTEGER NOT NULL DEFAULT 0, -- 0 = visible, 1 = soft-deleted (hidden)
    contract_cents INTEGER NOT NULL DEFAULT 0, -- this is the total amount of the phase, including any taxes and fees.
    retainer_cents INTEGER NOT NULL DEFAULT 0, -- this is the amount of retainer applied to this phase.
    billed_cents INTEGER NOT NULL DEFAULT 0, -- this is the total amount of the phase that has been billed to the customer.
    income_cents INTEGER NOT NULL DEFAULT 0, -- this is the total amount of income received for this phase.
    phase_project_manager TEXT, -- if null, use the project manager from the project. If not null, use this project manager for this phase.
    created_time DATETIME NOT NULL,
    created_id TEXT NOT NULL,
    updated_time DATETIME,
    updated_id TEXT,
    CONSTRAINT fk_qbo_id FOREIGN KEY (qbo_id) REFERENCES qbo_customers_projects(qbo_id),
    CHECK (bill_type IN ('fixed-fee', 'time-and-materials', 'non-billable')),
    CHECK (active IN (0, 1)),
    CHECK (billable IN (0, 1)),
    CHECK (deleted IN (0, 1)),
    CHECK (contract_cents >= 0),
    CHECK (retainer_cents >= 0),
    CHECK (billed_cents >= 0),
    CHECK (income_cents >= 0),
    CHECK (bill_type != 'non-billable' OR billable = 0),
    UNIQUE (id, qbo_id),
    FOREIGN KEY (parent_id, qbo_id) REFERENCES phases(id, qbo_id)
);

CREATE INDEX IF NOT EXISTS idx_phases_qbo_id ON phases (qbo_id);
CREATE INDEX IF NOT EXISTS idx_phases_parent_id ON phases (parent_id);
CREATE INDEX IF NOT EXISTS idx_phases_phase_id ON phases (phase_id);
CREATE INDEX IF NOT EXISTS idx_phases_phase_bill_type ON phases (bill_type);
CREATE INDEX IF NOT EXISTS idx_phases_active ON phases (active);
CREATE INDEX IF NOT EXISTS idx_phases_billable ON phases (billable);
CREATE INDEX IF NOT EXISTS idx_phases_deleted ON phases (deleted);
CREATE INDEX IF NOT EXISTS idx_phases_contract_cents ON phases (contract_cents);
CREATE INDEX IF NOT EXISTS idx_phases_retainer_cents ON phases (retainer_cents);
CREATE INDEX IF NOT EXISTS idx_phases_billed_cents ON phases (billed_cents);
CREATE INDEX IF NOT EXISTS idx_phases_qbo_parent ON phases (qbo_id, parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_phases_project_parent_phase
ON phases (
  qbo_id,
  COALESCE(parent_id, 0),
  lower(trim(phase_id))
);

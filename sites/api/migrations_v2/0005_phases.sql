CREATE TABLE
  IF NOT EXISTS phases (
    id INTEGER PRIMARY KEY,
    qbo_id TEXT NOT NULL CONSTRAINT fk_qbo_id REFERENCES qbo_customers (qbo_id) ON DELETE CASCADE,
    -- this is the id of the parent phase, if any
    parent_id INTEGER,
    phase_id TEXT NOT NULL CHECK (length (trim(phase_id)) > 0),
    name TEXT NOT NULL CHECK (length (trim(name)) > 0),
    description TEXT,
    -- can be 'fixed-fee', 'time-and-materials', 'non-billable'
    bill_type TEXT NOT NULL CONSTRAINT bill_type_check CHECK (
      bill_type IN ('fixed-fee', 'time-and-materials', 'non-billable')
    ),
    active INTEGER NOT NULL DEFAULT 1 CONSTRAINT active_check CHECK (active IN (0, 1)),
    billable INTEGER NOT NULL DEFAULT 1 CONSTRAINT billable_check CHECK (billable IN (0, 1)),
    deleted INTEGER NOT NULL DEFAULT 0 CONSTRAINT deleted_check CHECK (deleted IN (0, 1)),
    -- this is the total amount of the phase, including any taxes and fees.
    contract_cents INTEGER NOT NULL DEFAULT 0 CONSTRAINT contract_cents_check CHECK (contract_cents >= 0),
    -- this is the amount of retainer applied to this phase.
    retainer_cents INTEGER NOT NULL DEFAULT 0 CONSTRAINT retainer_cents_check CHECK (retainer_cents >= 0),
    -- this is the total amount of the phase that has been billed to the customer.
    billed_cents INTEGER NOT NULL DEFAULT 0 CONSTRAINT billed_cents_check CHECK (billed_cents >= 0), 
    -- this is the total amount of income received for this phase.
    income_cents INTEGER NOT NULL DEFAULT 0 CONSTRAINT income_cents_check CHECK (income_cents >= 0), 
    -- if null, use the project manager from the project. If not null, use this project manager for this phase.
    phase_project_manager TEXT, 
    created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_id TEXT NOT NULL,
    updated_time DATETIME,
    updated_id TEXT
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_phases_project_parent_phase ON phases (
  qbo_id,
  COALESCE(parent_id, 0),
  lower(trim(phase_id))
);
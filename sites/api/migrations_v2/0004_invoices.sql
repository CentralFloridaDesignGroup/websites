-- Invoice bundles are used to group multiple invoices together for a single customer. This is useful for customers who have multiple projects and want to receive a single invoice for all of their projects. The invoice_bundles table will hold the container of invoices. The invoices table will hold the direct link between invoice_bundles and invoices.
CREATE TABLE IF NOT EXISTS invoice_bundles (
    id INTEGER PRIMARY KEY,
    qbo_customer_id TEXT, -- This should be the customer's qbo_id, the qbo_id in invoices should refer to projects.
    bundle_number TEXT UNIQUE NOT NULL, -- this is the bundle number that will be displayed to the customer. It should be unique across all bundles.
    bundle_date DATETIME,
    created_time DATETIME,
    created_id TEXT,
    updated_time DATETIME,
    updated_id TEXT,
    CONSTRAINT fk_qbo_customer_id FOREIGN KEY (qbo_customer_id) REFERENCES qbo_customers_projects(qbo_id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_bundles_qbo_customer_id ON invoice_bundles (qbo_customer_id);

-- Invoices table will hold the container of invoice_line_items. Invoice line items are the direct link between phases and invoices. The invoice_line_items table will hold the direct link between phases and invoices.
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY,
    qbo_project_id TEXT,
    bundle_id INTEGER, -- this is the id of the invoice bundle that this invoice belongs to. Can be null if the invoice is not part of a bundle.
    invoice_number TEXT UNIQUE NOT NULL, -- this is the invoice number that will be displayed to the customer. It should be unique across all invoices.
    invoice_date DATETIME,
    due_date DATETIME,
    due_type TEXT NOT NULL DEFAULT 'due-on-receipt', -- can be 'due-on-receipt', 'net-15', 'net-30', 'net-60', 'custom'
    status TEXT NOT NULL DEFAULT 'draft', -- can be 'draft', 'active', 'paid', 'voided'
    invoice_total_cents INTEGER NOT NULL DEFAULT 0, -- this is the total amount of the invoice, including any taxes and fees.
    invoice_subtotal_cents INTEGER NOT NULL DEFAULT 0, -- this is the subtotal amount of the invoice, before any taxes and fees.
    invoice_discount_cents INTEGER NOT NULL DEFAULT 0, -- this is the total amount of discounts applied to the invoice.
    created_time DATETIME,
    created_id TEXT,
    updated_time DATETIME,
    updated_id TEXT,
    CONSTRAINT fk_qbo_project_id FOREIGN KEY (qbo_project_id) REFERENCES qbo_customers_projects(qbo_id),
    CONSTRAINT fk_bundle_id FOREIGN KEY (bundle_id) REFERENCES invoice_bundles(id)
);

CREATE INDEX IF NOT EXISTS idx_invoices_qbo_project_id ON invoices (qbo_project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status);

CREATE TABLE IF NOT EXISTS invoice_line_items (
    id INTEGER PRIMARY KEY,
    qbo_id TEXT,
    invoice_id INTEGER NOT NULL, -- this is the id of the invoice that this line item belongs to
    phase_id INTEGER, -- this is the id of the phase that this line item is associated with. Can be null if the line item is not associated with a phase.
    description TEXT,
    phase_total_bill_cents INTEGER NOT NULL DEFAULT 0,
    amount_cents INTEGER NOT NULL DEFAULT 0, -- this is the total amount of the line item, including any taxes and fees.
    created_time DATETIME,
    created_id TEXT,
    updated_time DATETIME,
    updated_id TEXT,
    CONSTRAINT fk_invoice_id FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    CONSTRAINT fk_phase_id FOREIGN KEY (phase_id) REFERENCES phases(id),
    CONSTRAINT fk_qbo_id FOREIGN KEY (qbo_id) REFERENCES qbo_customers_projects(qbo_id),
    CONSTRAINT uq_invoice_phase UNIQUE (invoice_id, phase_id) -- this constraint ensures that a phase can only be associated with one line item per invoice.
);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_phase_id ON invoice_line_items (phase_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_qbo_id ON invoice_line_items (qbo_id);

-- Note: invoice_line_items.phase_total_bill_cents is used to easily calculate the total billable amount for a phase across all invoices. This is useful for reporting and analytics purposes. It is not used for any calculations in the application logic, but it can be used to quickly retrieve the total billable amount for a phase without having to sum up all the line items for that phase across all invoices.
-- For instance. Bill 1 may have a line item for Phase A with a total bill of $100. Bill 2 may have a line item for Phase A with a total bill of $200. The phase_total_bill_cents for Phase A would be $300, which is the sum of all line items for that phase across all invoices. This allows us to quickly retrieve the total billable amount for a phase without having to sum up all the line items for that phase across all invoices. Can be reversed to figure out how much the bill is for a phase by saying how much we should have billed for a phase and subtracting the total billable amount for that phase across all invoices. This is useful for reporting and analytics purposes. It is not used for any calculations in the application logic, but it can be used to quickly retrieve the total billable amount for a phase without having to sum up all the line items for that phase across all invoices.

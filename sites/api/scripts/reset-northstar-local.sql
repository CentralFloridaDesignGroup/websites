-- Local-only Northstar reset. Do not run this against a remote database.
PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS client_files;
DROP TABLE IF EXISTS client_extra_data;
DROP TABLE IF EXISTS project_files;
DROP TABLE IF EXISTS project_extra_data;
DROP TABLE IF EXISTS project_phases;
DROP TABLE IF EXISTS record_ledger;
DROP TABLE IF EXISTS company_settings;
DROP TABLE IF EXISTS qbo_oauth_states;
DROP TABLE IF EXISTS qbo_customers_projects;
DROP TABLE IF EXISTS invoice_bundles;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS invoice_line_items;
DROP TABLE IF EXISTS phases;

-- Wrangler recreates this ledger when migrations are applied.
DROP TABLE IF EXISTS d1_migrations;

PRAGMA foreign_keys = ON;

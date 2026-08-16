CREATE TABLE
    IF NOT EXISTS company_settings (
        id INTEGER PRIMARY KEY,
        general_settings TEXT DEFAULT '{}',
        invoice_settings TEXT DEFAULT '{}',
        qbo_settings TEXT DEFAULT '{}'
    );

-- Populate the company_settings table with default values.
INSERT INTO
    company_settings (
        id,
        general_settings,
        invoice_settings,
        qbo_settings
    )
VALUES
    (
        1,
        '{"fullName": "White Point Surveying & Mapping LLC", "shortName": "White Point Survey", "address": {"line1": "642 Crimson Ct", "line2": "", "city": "Altamonte Springs", "state": "FL", "zip": "32701"}, "phone": "4077101980", "commonEmail": "info@whitepointsurvey.com", "website": "https://www.whitepointsurvey.com", "logoFullUrl": "", "logoSquareUrl": ""}',
        '{"invoiceIdTemplate": "WPS-YY-####", "invoiceIdCounter": 1, "resetInvoiceEachYear": true, "bundleIdTemplate": "WPS-YY-B####", "bundleIdCounter": 1, "resetBundleEachYear": true, "defaultNotes": "Thank you for your business!"}',
        '{}'
    );
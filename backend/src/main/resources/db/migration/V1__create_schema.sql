-- V1__create_schema.sql
-- Complete Flyway migration for Godown Portfolio Management

CREATE TABLE IF NOT EXISTS app_user (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS godown (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    pincode VARCHAR(20),
    size_sqft NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    current_tenant VARCHAR(200),
    tenant_phone VARCHAR(50),
    tenant_email VARCHAR(100),
    lease_start_date DATE,
    lease_end_date DATE,
    monthly_rent NUMERIC(14, 2) NOT NULL DEFAULT 0,
    security_advance NUMERIC(14, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_godown_code ON godown(code);
CREATE INDEX IF NOT EXISTS idx_godown_city ON godown(city);
CREATE INDEX IF NOT EXISTS idx_godown_status ON godown(status);
CREATE INDEX IF NOT EXISTS idx_godown_deleted ON godown(is_deleted);

CREATE TABLE IF NOT EXISTS rent_entry (
    id BIGSERIAL PRIMARY KEY,
    godown_id BIGINT NOT NULL REFERENCES godown(id) ON DELETE RESTRICT,
    rent_month VARCHAR(7) NOT NULL,
    due_date DATE NOT NULL,
    due_amount NUMERIC(14, 2) NOT NULL,
    paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    payment_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'DUE',
    payment_method VARCHAR(50),
    transaction_ref VARCHAR(100),
    receipt_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_godown_rent_month UNIQUE (godown_id, rent_month)
);

CREATE INDEX IF NOT EXISTS idx_rent_entry_godown ON rent_entry(godown_id);
CREATE INDEX IF NOT EXISTS idx_rent_entry_month ON rent_entry(rent_month);
CREATE INDEX IF NOT EXISTS idx_rent_entry_status ON rent_entry(status);
CREATE INDEX IF NOT EXISTS idx_rent_entry_due_date ON rent_entry(due_date);

CREATE TABLE IF NOT EXISTS asset (
    id BIGSERIAL PRIMARY KEY,
    godown_id BIGINT NOT NULL REFERENCES godown(id) ON DELETE RESTRICT,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    serial_number VARCHAR(100),
    quantity INT NOT NULL DEFAULT 1,
    cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
    condition VARCHAR(50) NOT NULL DEFAULT 'GOOD',
    purchase_date DATE,
    warranty_expiry_date DATE,
    notes TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_asset_godown ON asset(godown_id);
CREATE INDEX IF NOT EXISTS idx_asset_category ON asset(category);
CREATE INDEX IF NOT EXISTS idx_asset_warranty ON asset(warranty_expiry_date);
CREATE INDEX IF NOT EXISTS idx_asset_deleted ON asset(is_deleted);

CREATE TABLE IF NOT EXISTS employee (
    id BIGSERIAL PRIMARY KEY,
    godown_id BIGINT REFERENCES godown(id) ON DELETE SET NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(100),
    monthly_salary NUMERIC(14, 2) NOT NULL DEFAULT 0,
    joining_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employee_godown ON employee(godown_id);
CREATE INDEX IF NOT EXISTS idx_employee_status ON employee(status);
CREATE INDEX IF NOT EXISTS idx_employee_deleted ON employee(is_deleted);

CREATE TABLE IF NOT EXISTS salary_payment (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employee(id) ON DELETE RESTRICT,
    payment_month VARCHAR(7) NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    payment_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'PAID',
    payment_mode VARCHAR(50),
    transaction_ref VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_emp_salary_month UNIQUE (employee_id, payment_month)
);

CREATE INDEX IF NOT EXISTS idx_salary_emp ON salary_payment(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_month ON salary_payment(payment_month);

CREATE TABLE IF NOT EXISTS expense (
    id BIGSERIAL PRIMARY KEY,
    godown_id BIGINT NOT NULL REFERENCES godown(id) ON DELETE RESTRICT,
    category VARCHAR(100) NOT NULL,
    title VARCHAR(250) NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    responsibility VARCHAR(50) NOT NULL DEFAULT 'COMPANY',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    bill_date DATE NOT NULL,
    due_date DATE,
    payment_date DATE,
    payment_method VARCHAR(50),
    transaction_ref VARCHAR(100),
    receipt_url TEXT,
    notes TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expense_godown ON expense(godown_id);
CREATE INDEX IF NOT EXISTS idx_expense_category ON expense(category);
CREATE INDEX IF NOT EXISTS idx_expense_status ON expense(status);
CREATE INDEX IF NOT EXISTS idx_expense_due_date ON expense(due_date);
CREATE INDEX IF NOT EXISTS idx_expense_resp ON expense(responsibility);
CREATE INDEX IF NOT EXISTS idx_expense_deleted ON expense(is_deleted);

CREATE TABLE IF NOT EXISTS document (
    id BIGSERIAL PRIMARY KEY,
    godown_id BIGINT REFERENCES godown(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    public_url TEXT NOT NULL,
    document_type VARCHAR(100) NOT NULL DEFAULT 'OTHER',
    description TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_document_godown ON document(godown_id);
CREATE INDEX IF NOT EXISTS idx_document_type ON document(document_type);
CREATE INDEX IF NOT EXISTS idx_document_deleted ON document(is_deleted);

CREATE TABLE IF NOT EXISTS activity_log (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(100) NOT NULL,
    entity_id BIGINT NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    performed_by VARCHAR(100) NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at);

CREATE TABLE IF NOT EXISTS app_settings (
    id BIGSERIAL PRIMARY KEY,
    company_name VARCHAR(200) NOT NULL DEFAULT 'RGS Enterprises Godown Portfolio',
    logo_url TEXT,
    currency_symbol VARCHAR(10) NOT NULL DEFAULT '₹',
    contact_email VARCHAR(100) DEFAULT 'admin@rgsenterprises.com',
    contact_phone VARCHAR(50) DEFAULT '+91 98490 12345',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);


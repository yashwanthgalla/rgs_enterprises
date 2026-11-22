-- ==============================================================================
-- Schema Migration UP: Hub Extended Information, Hub Broadband, and Finance Module
-- ==============================================================================

-- 1. Drop existing 'occupied' columns from godown table if present
ALTER TABLE godown DROP COLUMN IF EXISTS occupied_sq_ft;
ALTER TABLE godown DROP COLUMN IF EXISTS occupied_sqft;

-- 2. Alter/extend godown with all specified fields
ALTER TABLE godown ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255);
ALTER TABLE hubs ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255);
ALTER TABLE godown ADD COLUMN IF NOT EXISTS erp_name VARCHAR(255);
ALTER TABLE godown ADD COLUMN IF NOT EXISTS hub_poc_name VARCHAR(255);
ALTER TABLE godown ADD COLUMN IF NOT EXISTS hub_poc_contact VARCHAR(20);
ALTER TABLE godown ADD COLUMN IF NOT EXISTS total_capacity NUMERIC(12,2) NULL;
ALTER TABLE godown ADD COLUMN IF NOT EXISTS current_tenant VARCHAR(255) DEFAULT 'Vacant';
ALTER TABLE godown ADD COLUMN IF NOT EXISTS hub_status VARCHAR(50) DEFAULT 'ACTIVE';
ALTER TABLE godown ADD COLUMN IF NOT EXISTS hub_model VARCHAR(50) DEFAULT 'LDP';
ALTER TABLE godown ADD COLUMN IF NOT EXISTS google_location TEXT;
ALTER TABLE godown ADD COLUMN IF NOT EXISTS location_address TEXT;
ALTER TABLE godown ADD COLUMN IF NOT EXISTS lease_start_date DATE;
ALTER TABLE godown ADD COLUMN IF NOT EXISTS lease_end_date DATE;
ALTER TABLE godown ADD COLUMN IF NOT EXISTS lease_duration_months INTEGER DEFAULT 0;
ALTER TABLE godown ADD COLUMN IF NOT EXISTS ops_poc_name VARCHAR(255);
ALTER TABLE godown ADD COLUMN IF NOT EXISTS ops_poc_mobile VARCHAR(20);
ALTER TABLE godown ADD COLUMN IF NOT EXISTS cctv_username VARCHAR(255);
ALTER TABLE godown ADD COLUMN IF NOT EXISTS cctv_password TEXT;
ALTER TABLE godown ADD COLUMN IF NOT EXISTS cctv_access_url TEXT;
ALTER TABLE godown ADD COLUMN IF NOT EXISTS labour_licence_available BOOLEAN DEFAULT FALSE;
ALTER TABLE godown ADD COLUMN IF NOT EXISTS labour_licence_start DATE;
ALTER TABLE godown ADD COLUMN IF NOT EXISTS labour_licence_expiry DATE;
ALTER TABLE godown ADD COLUMN IF NOT EXISTS trade_licence_available BOOLEAN DEFAULT FALSE;
ALTER TABLE godown ADD COLUMN IF NOT EXISTS trade_licence_start DATE;
ALTER TABLE godown ADD COLUMN IF NOT EXISTS trade_licence_expiry DATE;
ALTER TABLE godown ADD COLUMN IF NOT EXISTS total_setup_cost NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE godown ADD COLUMN IF NOT EXISTS refundable_advance NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE godown ADD COLUMN IF NOT EXISTS monthly_rent NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE godown ADD COLUMN IF NOT EXISTS electricity_service_provider VARCHAR(255);
ALTER TABLE godown ADD COLUMN IF NOT EXISTS electricity_service_number VARCHAR(100);
ALTER TABLE godown ADD COLUMN IF NOT EXISTS lease_contact_name VARCHAR(255);
ALTER TABLE godown ADD COLUMN IF NOT EXISTS lease_contact_mobile VARCHAR(20);
ALTER TABLE godown ADD COLUMN IF NOT EXISTS owner_address TEXT;
ALTER TABLE godown ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE godown ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Backfill erp_name & location_address from existing fields if empty
UPDATE godown SET erp_name = name WHERE erp_name IS NULL OR erp_name = '';
UPDATE godown SET location_address = address WHERE location_address IS NULL OR location_address = '';

-- 3. Create hub_broadband table (for separate broadband connection rows)
CREATE TABLE IF NOT EXISTS hub_broadband (
    id SERIAL PRIMARY KEY,
    hub_id BIGINT NOT NULL REFERENCES godown(id) ON DELETE CASCADE,
    network_provider VARCHAR(255),
    account_number VARCHAR(100),
    registered_mobile VARCHAR(20),
    user_id VARCHAR(100),
    current_plan_end_date DATE,
    service_contact_number VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hub_broadband_hub_id ON hub_broadband(hub_id);

-- 4. Create finance_total_revenue table (entered once per financial year per hub)
CREATE TABLE IF NOT EXISTS finance_total_revenue (
    id SERIAL PRIMARY KEY,
    hub_id BIGINT NOT NULL REFERENCES godown(id) ON DELETE CASCADE,
    financial_year VARCHAR(20) NOT NULL,
    rent NUMERIC(12,2) DEFAULT 0.00,
    setup_cost_per_month NUMERIC(12,2) DEFAULT 0.00,
    electricity NUMERIC(12,2) DEFAULT 0.00,
    manpower NUMERIC(12,2) DEFAULT 0.00,
    housekeeping NUMERIC(12,2) DEFAULT 0.00,
    wm_refreshment_petty_cash NUMERIC(12,2) DEFAULT 0.00,
    total_revenue NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_finance_total_revenue_hub_year UNIQUE (hub_id, financial_year)
);

CREATE INDEX IF NOT EXISTS idx_finance_total_revenue_hub_year ON finance_total_revenue(hub_id, financial_year);

-- 5. Create finance_rent table (entered once per period/month per hub)
CREATE TABLE IF NOT EXISTS finance_rent (
    id SERIAL PRIMARY KEY,
    hub_id BIGINT NOT NULL REFERENCES godown(id) ON DELETE CASCADE,
    period VARCHAR(50) NOT NULL,
    rent NUMERIC(12,2) DEFAULT 0.00,
    tds_percent NUMERIC(5,2) DEFAULT 10.00,
    tds_amount NUMERIC(12,2) DEFAULT 0.00,
    total_rent_after_tds NUMERIC(12,2) DEFAULT 0.00,
    gst_percent NUMERIC(5,2) DEFAULT 18.00,
    gst_amount NUMERIC(12,2) DEFAULT 0.00,
    total_rent_including_gst NUMERIC(12,2) DEFAULT 0.00,
    electricity_bill NUMERIC(12,2) DEFAULT 0.00,
    sorter_payments NUMERIC(12,2) DEFAULT 0.00,
    petty_cash NUMERIC(12,2) DEFAULT 0.00,
    total NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_finance_rent_hub_period UNIQUE (hub_id, period)
);

CREATE INDEX IF NOT EXISTS idx_finance_rent_hub_period ON finance_rent(hub_id, period);

-- 6. Add 'others' columns to hub finance tables
ALTER TABLE hub_yearly_revenues ADD COLUMN IF NOT EXISTS others NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE hub_monthly_rents ADD COLUMN IF NOT EXISTS others NUMERIC(12,2) DEFAULT 0.00;


-- ==============================================================================
-- Schema Migration DOWN: Rollback
-- ==============================================================================

DROP TABLE IF EXISTS finance_rent CASCADE;
DROP TABLE IF EXISTS finance_total_revenue CASCADE;
DROP TABLE IF EXISTS hub_broadband CASCADE;

ALTER TABLE godown ADD COLUMN IF NOT EXISTS occupied_sq_ft NUMERIC(12,2) DEFAULT 0;

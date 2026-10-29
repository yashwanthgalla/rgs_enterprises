-- V2__seed_initial_data.sql
-- Seed initial realistic dataset across Andhra Pradesh & Telangana

-- 1. App Settings
INSERT INTO app_settings (company_name, logo_url, currency_symbol, contact_email, contact_phone, updated_at)
VALUES ('RGS Enterprises Godown Portfolio', '', '₹', 'operations@rgsenterprises.com', '+91 98490 54321', CURRENT_TIMESTAMP);

-- 2. Admin User (BCrypt hash of Admin@12345: $2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi)
INSERT INTO app_user (username, password_hash, full_name, role, created_at, updated_at)
VALUES ('admin', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', 'System Administrator', 'ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 3. Godowns
INSERT INTO godown (name, code, city, state, address, pincode, size_sqft, status, current_tenant, tenant_phone, tenant_email, lease_start_date, lease_end_date, monthly_rent, security_advance, notes, created_at, updated_at)
VALUES
('Patancheru Central Hub', 'GDN-HYD-01', 'Hyderabad', 'Telangana', 'Plot 42-45, Phase II, IDA Patancheru, Sangareddy Dist', '502319', 45000.00, 'ACTIVE', 'Flipkart India Pvt Ltd', '+91 98491 11222', 'logistics.south@flipkart.com', '2025-04-01', '2027-03-31', 450000.00, 1800000.00, 'Grade A fulfillment centre with 8 loading docks and 12m clear height.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Autonagar Logistics Park', 'GDN-VJA-02', 'Vijayawada', 'Andhra Pradesh', 'Plot 18, Block B, Auto Nagar Industrial Estate', '520007', 28000.00, 'ACTIVE', 'VRL Logistics Ltd', '+91 98492 33444', 'vja.hub@vrllogistics.com', '2024-11-01', '2026-10-31', 220000.00, 880000.00, 'Strategic transit hub close to NH-16 highway junction.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Gajuwaka Coastal Warehouse', 'GDN-VSKP-03', 'Visakhapatnam', 'Andhra Pradesh', 'Survey 102/3, Near Port Connectivity Road, Gajuwaka', '530026', 36000.00, 'ACTIVE', 'Coromandel International Ltd', '+91 98493 55666', 'vizag.godown@coromandel.biz', '2024-01-01', '2026-12-31', 380000.00, 1520000.00, 'Heavy industrial flooring suitable for fertilizer and chemical storage.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Mirchi Yard Agro Facility', 'GDN-GNT-04', 'Guntur', 'Andhra Pradesh', 'NH-5 Bypass, Near Agricultural Market Committee Yard', '522004', 20000.00, 'ACTIVE', 'ITC Agri Business Division', '+91 98494 77888', 'agri.guntur@itc.in', '2025-02-01', '2027-01-31', 180000.00, 720000.00, 'Cold-chain compatible humidity-controlled godown.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Madikonda Industrial Depot', 'GDN-WGL-05', 'Warangal', 'Telangana', 'TSIIC Industrial Park, Madikonda, Kazipet', '506142', 15000.00, 'VACANT', NULL, NULL, NULL, NULL, NULL, 120000.00, 0.00, 'Recently renovated PEB structure ready for immediate occupation.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Renigunta Cargo Terminal', 'GDN-TPT-06', 'Tirupati', 'Andhra Pradesh', 'Adjacent to Airport Cargo Rd, Renigunta', '517520', 22000.00, 'ACTIVE', 'Heritage Foods Ltd', '+91 98495 99000', 'tirupati.depot@heritagefoods.in', '2024-06-01', '2026-05-31', 200000.00, 800000.00, 'FMCG and dairy distribution warehouse with 24/7 power backup.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 4. Assets
INSERT INTO asset (godown_id, name, category, serial_number, quantity, cost, condition, purchase_date, warranty_expiry_date, notes, created_at, updated_at)
VALUES
(1, 'Toyota 3-Ton Electric Forklift', 'Material Handling', 'TYT-FL-2023-881', 2, 1600000.00, 'EXCELLENT', '2023-05-10', '2026-05-09', 'Annual maintenance contract with Toyota Material Handling.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 'Kirloskar 125 kVA Silent Generator', 'Power Backup', 'KIR-GEN-9421', 1, 850000.00, 'GOOD', '2023-04-15', '2025-04-14', 'Scheduled service every 250 running hours.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 'Hikvision 32-Channel IP CCTV System', 'Security & Surveillance', 'HIK-NVR-32-09', 1, 320000.00, 'EXCELLENT', '2024-01-20', '2027-01-19', 'NVR with 60 days continuous cloud backup.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'Avery Weigh-Tronix 60-Ton Weighbridge', 'Weighing Equipment', 'AVW-60T-4102', 1, 1200000.00, 'GOOD', '2022-08-10', '2025-08-09', 'Legal metrology calibration stamped annually.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'Ceasefire Automatic Fire Sprinkler System', 'Fire Safety', 'CF-SPR-5501', 1, 950000.00, 'EXCELLENT', '2024-02-14', '2029-02-13', 'Connected to 50,000L dedicated fire water sump.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, 'Voltas Industrial Dehumidifier Unit', 'Climate Control', 'VOLT-DH-102', 4, 480000.00, 'GOOD', '2023-09-01', '2025-08-31', 'Required for spice and seed storage humidity below 65%.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, 'Godrej Manual Hydraulic Pallet Trucks', 'Material Handling', 'GDJ-HPT-01-04', 4, 140000.00, 'FAIR', '2023-02-18', '2024-02-17', 'Warranty expired; routine seal replacement done in-house.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 5. Employees
INSERT INTO employee (godown_id, full_name, role, phone, email, monthly_salary, joining_date, status, created_at, updated_at)
VALUES
(1, 'K. Venkata Rao', 'Warehouse Manager', '+91 98480 11001', 'vrao.patancheru@rgsenterprises.com', 48000.00, '2023-03-01', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 'M. Srinivasulu', 'Security Supervisor', '+91 98480 11002', 'srinivas.security@rgsenterprises.com', 26000.00, '2023-04-01', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'P. Ramesh Reddy', 'Operations In-charge', '+91 98480 22001', 'ramesh.vja@rgsenterprises.com', 42000.00, '2023-06-15', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'G. Satyanarayana', 'Facility Engineer', '+91 98480 33001', 'satya.vizag@rgsenterprises.com', 45000.00, '2023-01-10', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, 'Ch. Venkatesh', 'Godown Supervisor', '+91 98480 44001', 'venky.guntur@rgsenterprises.com', 32000.00, '2024-01-15', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, 'B. Ramana Murthy', 'Security & Gate Officer', '+91 98480 66001', 'ramana.tpt@rgsenterprises.com', 24000.00, '2024-05-01', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 6. Salary Payments (Recent months)
INSERT INTO salary_payment (employee_id, payment_month, amount, payment_date, status, payment_mode, transaction_ref, notes, created_at, updated_at)
VALUES
(1, '2026-09', 48000.00, '2026-10-02', 'PAID', 'BANK_TRANSFER', 'NEFT-HDFC-99214', 'September salary credited', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, '2026-09', 26000.00, '2026-10-02', 'PAID', 'BANK_TRANSFER', 'NEFT-HDFC-99215', 'September salary credited', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, '2026-09', 42000.00, '2026-10-03', 'PAID', 'BANK_TRANSFER', 'NEFT-HDFC-99216', 'September salary credited', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, '2026-09', 45000.00, '2026-10-03', 'PAID', 'BANK_TRANSFER', 'NEFT-HDFC-99217', 'September salary credited', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(5, '2026-09', 32000.00, '2026-10-04', 'PAID', 'BANK_TRANSFER', 'NEFT-HDFC-99218', 'September salary credited', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, '2026-09', 24000.00, '2026-10-04', 'PAID', 'BANK_TRANSFER', 'NEFT-HDFC-99219', 'September salary credited', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 7. Rent Ledger (Covering previous months and current month dues)
INSERT INTO rent_entry (godown_id, rent_month, due_date, due_amount, paid_amount, payment_date, status, payment_method, transaction_ref, notes, created_at, updated_at)
VALUES
-- Patancheru (Flipkart)
(1, '2026-08', '2026-08-05', 450000.00, 450000.00, '2026-08-04', 'PAID', 'BANK_TRANSFER', 'CMS-FLIPKART-8821', 'Paid on time via CMS', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, '2026-09', '2026-09-05', 450000.00, 450000.00, '2026-09-03', 'PAID', 'BANK_TRANSFER', 'CMS-FLIPKART-9104', 'Paid on time', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, '2026-10', '2026-10-05', 450000.00, 450000.00, '2026-10-04', 'PAID', 'BANK_TRANSFER', 'CMS-FLIPKART-9642', 'Current month cleared', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
-- Autonagar (VRL Logistics)
(2, '2026-08', '2026-08-05', 220000.00, 220000.00, '2026-08-05', 'PAID', 'NEFT_RTGS', 'RTGS-VRL-44120', 'August rent settled', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, '2026-09', '2026-09-05', 220000.00, 220000.00, '2026-09-07', 'PAID', 'NEFT_RTGS', 'RTGS-VRL-48901', 'September rent settled', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, '2026-10', '2026-10-05', 220000.00, 0.00, NULL, 'OVERDUE', NULL, NULL, 'Followed up with regional accounts manager; cheque in processing', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
-- Visakhapatnam (Coromandel)
(3, '2026-09', '2026-09-05', 380000.00, 380000.00, '2026-09-02', 'PAID', 'BANK_TRANSFER', 'CITI-COROMANDEL-02', 'Paid via corporate banking', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, '2026-10', '2026-10-05', 380000.00, 380000.00, '2026-10-05', 'PAID', 'BANK_TRANSFER', 'CITI-COROMANDEL-09', 'October rent cleared', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
-- Guntur (ITC)
(4, '2026-09', '2026-09-05', 180000.00, 180000.00, '2026-09-04', 'PAID', 'BANK_TRANSFER', 'ITC-AGRI-RENT-991', 'Cleared', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, '2026-10', '2026-10-05', 180000.00, 0.00, NULL, 'OVERDUE', NULL, NULL, 'Payment invoice approval pending at corporate office', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
-- Tirupati (Heritage Foods)
(6, '2026-09', '2026-09-05', 200000.00, 200000.00, '2026-09-05', 'PAID', 'CHEQUE', 'CHQ-SBI-77821', 'Cheque cleared', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, '2026-10', '2026-10-05', 200000.00, 200000.00, '2026-10-06', 'PAID', 'UPI', 'UPI-HERITAGE-4412', 'Cleared via instant bank transfer', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 8. Operating Expenses & Utility Bills
INSERT INTO expense (godown_id, category, title, amount, responsibility, status, bill_date, due_date, payment_date, payment_method, transaction_ref, notes, created_at, updated_at)
VALUES
(1, 'ELECTRICITY', 'TSSPDCL HT Electricity Bill Oct 2026', 84200.00, 'TENANT', 'RECEIVABLE', '2026-10-02', '2026-10-22', NULL, NULL, NULL, 'Tenant Flipkart reimbursed directly on consumer number 441029.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 'PROPERTY_TAX', 'GHMC Annual Commercial Property Tax FY26-27', 125000.00, 'COMPANY', 'PAID', '2026-04-10', '2026-04-30', '2026-04-25', 'BANK_TRANSFER', 'GHMC-TAX-2026-99', 'Early payment 5% rebate availed.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'ELECTRICITY', 'APCPDCL Commercial Power Bill Oct 2026', 42600.00, 'TENANT', 'RECEIVABLE', '2026-10-05', '2026-10-25', NULL, NULL, NULL, 'Bill sent to VRL accounts for payment.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'MAINTENANCE', 'Roof Sheeting Leakage Repair & Waterproofing', 38000.00, 'COMPANY', 'PAID', '2026-09-12', '2026-09-20', '2026-09-18', 'UPI', 'UPI-VENDOR-ROOF-41', 'Pre-monsoon roof inspection repairs completed.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'SECURITY', 'Premier Security Guards 24/7 Deployment (4 Guards)', 68000.00, 'COMPANY', 'PENDING', '2026-10-01', '2026-10-15', NULL, NULL, NULL, 'Monthly bill from Premier Security Services.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'INSURANCE', 'New India Assurance Commercial Warehouse Fire & Perils', 95000.00, 'COMPANY', 'PAID', '2026-02-10', '2026-02-28', '2026-02-20', 'NEFT_RTGS', 'NIA-POL-554109', 'Annual policy valid till Feb 2027.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, 'INTERNET', 'Airtel Broadband Corporate Lease Line (100 Mbps)', 4500.00, 'COMPANY', 'PENDING', '2026-10-01', '2026-10-18', NULL, NULL, NULL, 'CCTV camera uplink and office fiber connection.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(5, 'MAINTENANCE', 'Vacant Warehouse Deep Cleaning & Painting Touchup', 18500.00, 'COMPANY', 'PAID', '2026-09-28', '2026-10-05', '2026-10-04', 'CASH', 'VOUCH-CASH-441', 'Preparation for prospective tenant walkthrough.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, 'ELECTRICITY', 'APSPDCL Commercial Power Bill Oct 2026', 31200.00, 'TENANT', 'RECEIVABLE', '2026-10-04', '2026-10-24', NULL, NULL, NULL, 'Shared with Heritage Foods.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, 'WATER', 'Municipal Industrial Water Tanker Supply', 12000.00, 'COMPANY', 'PENDING', '2026-10-08', '2026-10-28', NULL, NULL, NULL, 'Fire tank replenishment and sanitation.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 9. Activity Logs
INSERT INTO activity_log (entity_type, entity_id, action, description, performed_by, created_at)
VALUES
('GODOWN', 1, 'CREATE', 'Created godown record Patancheru Central Hub (GDN-HYD-01)', 'admin', CURRENT_TIMESTAMP),
('LEASE', 1, 'UPDATE', 'Executed 2-year lease with Flipkart India Pvt Ltd at ₹4,50,000/mo', 'admin', CURRENT_TIMESTAMP),
('RENT', 3, 'PAYMENT_RECORDED', 'Recorded October 2026 rent payment of ₹4,50,000 for GDN-HYD-01', 'admin', CURRENT_TIMESTAMP),
('EXPENSE', 5, 'CREATE', 'Added monthly security invoice ₹68,000 for GDN-VSKP-03', 'admin', CURRENT_TIMESTAMP),
('GODOWN', 5, 'STATUS_CHANGE', 'Updated Madikonda Industrial Depot status to VACANT', 'admin', CURRENT_TIMESTAMP);

# Hub Management Update & Finance Module Documentation

## 1. Summary of Changes

### Part 1: Add Hub Form & Validation
- **Section 1: Hub Information**
  - `ERP Name`: Text (Required)
  - `Hub POC Name`: Text (Required)
  - `Hub POC Contact`: Phone (10 digits validation, Required)
  - `Total Capacity`: Number (Optional)
  - `Current Tenant`: Text (Mandatory)
  - `Hub Status`: Dropdown (`Active`, `Under Maintenance`, `Yet to Live`, `Closed`, `Terminated`) (Required)
  - `Hub Model`: Dropdown (`LDP`, `OSH`, `ISH`) (Required)
  - `Google Location`: Google Maps link (Required)
  - `Location Address`: Textarea (Required)
  - **Removed**: Existing `Occupied` (`occupiedSqFt`) field completely removed from UI, API payloads, and database schema.
- **Section 2: Lease Information**
  - `Lease Start Date` & `Lease End Date` (validates that End Date > Start Date)
  - `Total Lease Duration (Months)`: Read-only auto-calculated live badge/field updating on date change.
- **Section 3: Operations Information**
  - `Operations POC Name`: Required
  - `Operations POC Mobile`: 10-digit validation
- **Section 4: Broadband Details (Dynamic & Multiple)**
  - "Add Broadband" button adds independent connection blocks.
  - Fields: `Network Provider`, `Account Number`, `Registered Mobile Number` (10 digits), `User ID`, `Current Plan End Date`, `Service Contact Number`.
  - Independent `Remove` action per block.
  - Stored as separate rows in `hub_broadband` table linked via foreign key with `ON DELETE CASCADE`.
- **Section 5: CCTV Details**
  - `CCTV Username`
  - `CCTV Password`: Masked input with a show/hide toggle. Stored encrypted on the backend using symmetric stream cipher with random IV.
  - `CCTV Access URL / IP`
- **Section 6: Labour Licence**
  - Yes / No toggle.
  - When `Yes`: shows `Licence Start Date` and `Licence Expiry Date` (validates Expiry > Start).
  - When `No`: hides fields and clears values.
- **Section 7: Trade Licence**
  - Yes / No toggle.
  - When `Yes`: shows `Licence Start Date` and `Licence Expiry Date` (validates Expiry > Start).
  - When `No`: hides fields and clears values.
- **Section 8: Financial Information**
  - `Total Setup Cost`, `Refundable Advance Amount`, `Monthly Rent`.
  - All numeric, non-negative, with 2 decimal places.
- **Section 9: Electricity Information**
  - `Service Provider` & `Electricity Service Number`.
- **Section 10: Lease Contact and Owner Information**
  - `Lease Contact Name`, `Lease Contact Mobile Number` (10-digit validation), `Owner Address`.

---

### Part 2: SQL Schema & Migrations
The migration scripts are available in:
- Up migration: `backend/migrations_sql/schema_migration_up.sql`
- Down rollback: `backend/migrations_sql/schema_migration_down.sql`

#### Tables Created / Altered:
1. `godown` (Hubs): Dropped `occupied_sq_ft` column. Added `erp_name`, `hub_poc_name`, `hub_poc_contact`, `total_capacity`, `hub_status`, `hub_model`, `google_location`, `location_address`, `lease_duration_months`, `ops_poc_name`, `ops_poc_mobile`, `cctv_password` (encrypted), `labour_licence_available`, `trade_licence_available`, `total_setup_cost`, `refundable_advance`, `electricity_service_provider`, etc.
2. `hub_broadband`:
   - `id SERIAL PRIMARY KEY`
   - `hub_id BIGINT REFERENCES godown(id) ON DELETE CASCADE`
   - `network_provider`, `account_number`, `registered_mobile`, `user_id`, `current_plan_end_date`, `service_contact_number`, `created_at`
3. `finance_total_revenue`:
   - `id SERIAL PRIMARY KEY`
   - `hub_id BIGINT REFERENCES godown(id) ON DELETE CASCADE`
   - `financial_year VARCHAR(20) NOT NULL`
   - `rent`, `setup_cost_per_month`, `electricity`, `manpower`, `housekeeping`, `wm_refreshment_petty_cash`, `total_revenue`, timestamps.
   - `UNIQUE (hub_id, financial_year)` constraint.
4. `finance_rent`:
   - `id SERIAL PRIMARY KEY`
   - `hub_id BIGINT REFERENCES godown(id) ON DELETE CASCADE`
   - `period VARCHAR(50) NOT NULL`
   - `rent`, `tds_percent` (10%), `tds_amount`, `total_rent_after_tds`, `gst_percent` (18%), `gst_amount`, `total_rent_including_gst`, `electricity_bill`, `sorter_payments`, `petty_cash`, `total`, timestamps.
   - `UNIQUE (hub_id, period)` constraint.

---

### Part 3: Finance Module (`/finance`)
- Added **Finance** navigation item in the sidebar with route `/finance`.
- Contains two dedicated tabs with Hub Selector dropdown at the top:
  1. **Tab 1: Total Revenue (Yearly)**:
     - Entered once per year per hub.
     - Live auto-calculation:
       $$\text{Total Revenue} = \text{Rent} + \text{Setup Cost/Month} + \text{Electricity} + \text{Manpower} + \text{Housekeeping} + \text{WM/Petty Cash}$$
     - Table history with Edit and Delete actions.
  2. **Tab 2: Rent (Monthly)**:
     - Entered per month per hub.
     - Live auto-calculations:
       $$\text{TDS Amount} = \text{Rent} \times 10\%$$
       $$\text{Total Rent After TDS} = \text{Rent} - \text{TDS Amount}$$
       $$\text{GST Amount (18\%)} = \text{Rent} \times 18\%$$
       $$\text{Total Rent Including GST} = \text{Total Rent After TDS} + \text{GST Amount}$$
       $$\text{Grand Total} = \text{Total Rent Including GST} + \text{Electricity Bill} + \text{Sorter Payments} + \text{Petty Cash}$$
     - Table history showing full breakdown with Edit and Delete actions.

---

### How to Run the SQL Migration

1. Open your **Supabase Dashboard** -> **SQL Editor**.
2. Copy and paste the contents of `backend/migrations_sql/schema_migration_up.sql`.
3. Click **Run**.
4. To rollback at any time, run `backend/migrations_sql/schema_migration_down.sql`.

# GodownIQ • Warehouse Portfolio Management System

A production-grade, Apple-designed Godown (Warehouse) Portfolio Management web application designed for commercial warehouse operators managing multiple godown locations, long-term tenant leases, operating utility expenses, equipment assets, stationed staff, bill reminders, document archives, and SQL-aggregated financial analytics.

Built with **React 18 + TypeScript + Tailwind CSS** on the frontend, and **Spring Boot 3.3.5 + Java 17 + PostgreSQL (Supabase) + Flyway** on the backend.

---

## 🏗️ Architecture & Stack

### Backend
- **Framework**: Spring Boot 3.3.5 (Java 17 target)
- **Database**: PostgreSQL (managed via Supabase or local PostgreSQL)
- **Schema & Migrations**: Flyway (`V1__create_schema.sql`, `V2__seed_initial_data.sql`)
- **Security**: Spring Security 6 with stateless JSON Web Tokens (JWT) & BCrypt password encryption
- **Data Layer**: Spring Data JPA, Hibernate, Repository-Service-Controller architecture with immutable Java Records for DTOs
- **Storage**: Supabase Storage for multipart file uploads (PDF, PNG, JPG, DOCX, XLSX up to 5MB) with local fallback
- **API Documentation**: OpenAPI 3 / Swagger (`/swagger-ui.html`, `/api-docs`)
- **Health Check**: Spring Boot Actuator (`/actuator/health`) for Render zero-downtime deploys

### Frontend
- **Framework**: React 18, Vite 6, TypeScript
- **Routing**: React Router DOM v6
- **Server State**: TanStack React Query v5 (caching, background revalidation, optimistic mutations)
- **Design System**: Apple Human Interface Guidelines (SF Pro / Inter font, `#F5F5F7` canvas, frosted glass backdrop blur, 16–20px radii, pill controls, segmented controls, spring modals)
- **Icons**: Lucide React SVG icons (no emojis used)
- **Data Visualization**: Recharts (Cashflow bar charts, expense category distribution pie charts)
- **Forms & Validation**: React Hook Form with Zod schema validation
- **Currency & Localization**: Indian Rupee (`Intl.NumberFormat('en-IN')`)

---

## 🔑 Environment Variables

| Variable | Description | Default / Example | Target |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL JDBC connection URL | `jdbc:postgresql://db.[ref].supabase.co:5432/postgres` | Backend |
| `DB_USER` | PostgreSQL user | `postgres` | Backend |
| `DB_PASSWORD` | PostgreSQL password | `[Your_Strong_Password]` | Backend |
| `JWT_SECRET` | 256-bit secret key for HMAC SHA signing | `404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970` | Backend |
| `ADMIN_USERNAME` | Superadmin login username | `admin` | Backend |
| `ADMIN_PASSWORD` | Superadmin initial password | `Admin@12345` | Backend |
| `SUPABASE_URL` | Supabase Project URL | `https://[ref].supabase.co` | Backend |
| `SUPABASE_SERVICE_KEY`| Supabase Service Role Key (Storage API) | `eyJhbGciOi...` | Backend |
| `STORAGE_BUCKET` | Supabase Storage Bucket name | `godown-documents` | Backend |
| `CORS_ORIGIN` | Allowed Frontend origins (comma separated) | `http://localhost:5173,https://your-app.vercel.app` | Backend |
| `PORT` | HTTP server port | `8080` (Render sets automatically) | Backend |
| `VITE_API_URL` | Base REST API URL consumed by frontend | `http://localhost:8080/api/v1` or `https://[render-app].onrender.com/api/v1` | Frontend |

---

## 🚀 Quickstart: Running Locally

### 1. Prerequisites
- **JDK 17 or 21** installed (`java -version`)
- **Apache Maven 3.9+** (`mvn -version`)
- **Node.js 18+ & npm** (`node -v`)
- PostgreSQL running locally or a free [Supabase](https://supabase.com) project.

### 2. Backend Setup
1. Copy `.env.example` to `backend/.env` (or configure system env vars).
2. Run database migrations and start the backend service:
   ```bash
   cd backend
   mvn clean spring-boot:run
   ```
3. The server starts on `http://localhost:8080`.
4. Open Swagger documentation at: `http://localhost:8080/swagger-ui.html`.
5. Run unit & integration tests:
   ```bash
   mvn clean verify
   ```

### 3. Frontend Setup
1. Open a new terminal:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
2. Open your browser at `http://localhost:5173`.
3. Sign in with the default credentials:
   - **Username**: `admin`
   - **Password**: `Admin@12345`

---

## 🗄️ Supabase PostgreSQL & Storage Setup

1. Create a new project on [Supabase](https://supabase.com).
2. Go to **Project Settings > Database**:
   - Copy the **Connection string > JDBC**:
     ```
     jdbc:postgresql://db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
     ```
3. Go to **Storage**:
   - Create a new public bucket named `godown-documents`.
   - Add policy allowing authenticated/service-role uploads and public reads.
4. Go to **Project Settings > API**:
   - Copy your **Project URL** (`https://[YOUR-PROJECT-REF].supabase.co`).
   - Copy your **service_role secret** key (used by backend for secure multipart file streaming).

---

## ☁️ Deployment Guide

### A. Deploy Backend to Render (Docker Web Service)
1. Push your repository to GitHub.
2. In [Render](https://dashboard.render.com), click **New + > Blueprint** and connect your repository (Render will automatically detect `render.yaml`).
   - *Alternatively*: Click **New + > Web Service**, select Docker environment, set Dockerfile path to `backend/Dockerfile` and Context to `backend`.
3. Add the required Environment Variables in the Render Dashboard:
   - `DATABASE_URL`: Your Supabase JDBC URL
   - `DB_USER`: `postgres`
   - `DB_PASSWORD`: Your Supabase password
   - `JWT_SECRET`: Generate a random 64-character hex string
   - `ADMIN_USERNAME`: `admin`
   - `ADMIN_PASSWORD`: Your chosen strong administrator password
   - `SUPABASE_URL`: `https://[ref].supabase.co`
   - `SUPABASE_SERVICE_KEY`: Your Supabase service role key
   - `STORAGE_BUCKET`: `godown-documents`
   - `CORS_ORIGIN`: `https://your-frontend-app.vercel.app`
4. Deploy! The health check is exposed at `/actuator/health`.

### B. Deploy Frontend to Vercel
1. In [Vercel](https://vercel.com), click **Add New... > Project** and import your Git repository.
2. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Environment Variable:
   - `VITE_API_URL`: `https://[your-render-backend-url].onrender.com/api/v1`
4. Click **Deploy**. Vercel will build and serve your SPA. SPA client-side routing is handled seamlessly by `frontend/vercel.json`.

---

## 🏢 Core Business Domains Covered

1. **Godown Fleet Directory**: Full geographic inventory across Hyderabad, Vijayawada, Visakhapatnam, Guntur, Warangal, and Tirupati. Tracks floor area (sq ft), active leases, tenant profiles, and blocks facility deletion if active child records exist (HTTP 409).
2. **Rent Ledger**: Monthly rent roll tracking due, paid, overdue, and partial payments with transaction references and payment vouchers.
3. **Security Deposit Tracking**: Company-held security advances tracked independently from operational expenses.
4. **Equipment & Asset Register**: Machinery inventory (forklifts, diesel generators, weighbridges, CCTV, fire safety) with condition pills, purchase records, and warranty expiration alerts.
5. **Stationed Staff & Payroll**: Onboard managers, security supervisors, and maintenance technicians with monthly salary disbursement logs.
6. **Operating Expenses & Bills**: EB electricity, internet, maintenance, property taxes, and vendor bills with clear tenant vs company responsibility assignment.
7. **Document Vault**: Upload leases, invoices, and inspection reports up to 5MB directly into Supabase Storage with instant download.
8. **Reports & Analytics**: Real-time SQL aggregations for revenue vs expenses, net operating profit, category breakdown, and 1-click CSV export and print view.
9. **Settings & Custom Branding**: Configurable company title (`[APP NAME]`), currency symbol, and logo URL stored in PostgreSQL.


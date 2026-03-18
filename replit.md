# Scapex V1.2 — Smart Business Management Platform (ERP)

## Architecture
- **Version**: V1.2
- **Frontend**: React + TypeScript + Vite, wouter routing, shadcn/ui + Tailwind CSS
- **Backend**: Express (port 5000) — serves API routes + static files
- **Database**: PostgreSQL with Drizzle ORM — 62 tables covering all modules
- **DB Connection**: `server/db.ts` — pooled connection via `DATABASE_URL`
- **Schema**: `shared/schema.ts` — comprehensive schema with multi-tenant support (`company_id` on all tables)
- **Languages**: Full Arabic (RTL) + English (LTR) bilingual — toggled via `useLanguage()` hook
- **Auth**: localStorage-based sessions with RBAC + multi-activity permissions + email verification
- **Dark Mode**: Full dark/light mode with clear card borders and distinct background/card contrast
- **Client Portal**: 6 color themes (Default, Ocean, Forest, Royal, Sunset, Slate) + dark mode toggle
- **Auth Features**: Forgot password (verification code), email verification on registration, admin approval flow

## Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@scapex.sa | Admin@123 |
| Manager | manager@scapex.sa | Manager@123 |
| Accountant | accountant@scapex.sa | Account@123 |
| Engineer | engineer@scapex.sa | Engineer@123 |

## Database Schema (62 Tables)

### Core/System (7)
companies, branches, users, roles, audit_logs, notifications

### CRM (4)
contacts, pipeline_stages, deals, crm_activities

### Sales (4)
proposals, proposal_items, contracts, contract_items

### Purchases (3)
vendors, purchase_orders, purchase_order_items

### Inventory (3)
warehouses, inventory_items, stock_movements

### Accounting (7)
chart_of_accounts, fiscal_periods, journal_entries, journal_entry_lines, invoices, invoice_items, payments

### HR (4)
departments, positions, employees, employee_documents

### Payroll (3)
salary_structures, payroll_batches, payroll_items

### Attendance (4)
shifts, attendance_records, leave_types, leave_requests

### Projects (4)
projects, project_tasks, project_milestones, timesheets

### Engineering (3)
drawings, drawing_versions, drawing_reviews

### Government (2)
government_entities, permits

### HSE (3)
incidents, inspections, safety_trainings

### Equipment (3)
asset_categories, assets, maintenance_records

### DMS (3)
document_categories, documents, document_versions

### Approvals (4)
approval_workflows, approval_steps, approval_requests, approval_actions

### Service Catalog (2)
service_categories, services

## Key Storage Keys (localStorage — frontend data, pending migration to PostgreSQL API)
- `scapex_proposals` — all proposals (JSON array)
- `scapex_contracts` — all generated contracts (JSON array)
- `scapex_activities` — business activities config (version: v2)
- `users` — user accounts (version: v3)
- `scapex_proposal_prefill` — temporary CRM/Sales→Proposal prefill data
- `scapex_proposal_sub` — sub-service prefill from Service Catalog
- `scapex_hr_employees` — HR employee records
- `scapex_payroll_batches` — payroll batches
- `scapex_attendance` — daily attendance records
- `scapex_leaves` — employee leave requests
- `scapex_purchase_orders` — purchase orders
- `scapex_vendors` — vendor/supplier records
- `scapex_inventory_items` — inventory/stock items
- `scapex_assets` — equipment and fleet assets
- `scapex_maintenance` — maintenance logs
- `scapex_incidents` — HSE incident reports
- `scapex_inspections` — HSE inspection records
- `scapex_documents` — DMS document records
- `scapex_drawings` — engineering drawing records
- `scapex_permits` — government permits & licenses
- `scapex_mt_companies` — multi-tenant companies
- `scapex_mt_branches` — multi-tenant branches
- `scapex_approval_requests` — approval workflow requests
- `scapex_approval_workflows` — approval workflow templates
- `scapex_mobile_devices` — mobile app devices
- `scapex_mobile_reports` — field site reports
- `scapex_mobile_features` — app feature toggles

## Modules — All 22 Built & Functional

### Core & Analytics
- **Dashboard** (`/dashboard`) — Overview, KPIs, recent activity
- **BI Analytics** (`/bi`) — Revenue charts, service breakdown, top clients, KPI bars
- **AI Control Center** (`/ai-control`) — AI insights, automation rules
- **Company Management** (`/companies`) — Multi-tenant: companies, branches, org structure

### Business & Finance
- **CRM** (`/crm`) — Pipeline board + Customers list + Dashboard
- **Sales** (`/sales`) — Quotations (linked to proposals) + Contracts
- **Purchases** (`/purchases`) — Purchase orders + Vendor management (CRUD)
- **Accounting** (`/accounting`) — Financial views, invoices

### Operations
- **Projects** (`/projects`) — Project tracking
- **Inventory** (`/inventory`) — Stock items, warehouses, movements (CRUD)
- **Equipment & Fleet** (`/equipment`) — Assets, vehicles, maintenance logs (CRUD)

### Engineering & Compliance
- **Engineering Drawings** (`/engineering`) — CAD drawings, revisions, approval workflow (CRUD)
- **Approvals Center** (`/approvals`) — Centralized multi-level approval workflows for all modules
- **Government Entities** (`/government`) — Permits, licenses, expiry tracking (CRUD)
- **Smart Proposal Generator** (`/smart-proposal`) — Full AI-powered system with Market Benchmark pricing
- **Service Catalog** (`/service-catalog`) — 11 detailed sub-services with pricing

### Human Resources
- **HR** (`/hr`) — Employee directory, departments, CRUD with Saudi-specific fields
- **Payroll** (`/payroll`) — Salary batches, payslips, GOSI deductions
- **GPS Attendance** (`/attendance`) — Daily attendance log, leave requests with approval flow
- **HSE** (`/hse`) — Incident reports, safety inspections, PPE tracking
- **Engineers Mobile App** (`/mobile-app`) — Device management, site reports, live map, feature toggles

### System & Portals
- **DMS** (`/dms`) — Document storage, versioning, access control (CRUD)
- **Client Portal** (`/client-portal`) — Client self-service
- **Users** (`/users`) — User management
- **System Admin** (`/system-admin`) — Platform configuration

## Smart Proposal Generator Features
- **6 service type templates**: Engineering Consulting, Environmental, Safety Consulting, Safety Services, Contracting, Metal Recycling
- **11 sub-service templates**: Fire alarm install/maintenance, equipment supply, emergency training, building/road/government construction, infrastructure maintenance, humanization
- **AI item generation**: Auto-generates bilingual (AR/EN) line items with Saudi market pricing
- **Price suggestions**: Historical price analytics from past proposals (min/avg/max + item suggestions)
- **3-step create wizard**: Service type → Client info → Project details
- **Status workflow**: Draft → Sent → Approved → Contract/Invoice
- **Contract generation**: Auto-generates 8-article bilingual legal contract with payment schedule
- **PDF printing**: `printProposal()` and `printContract()` generate styled HTML + auto-print
- **CRM/Sales integration**: `scapex_proposal_prefill` localStorage key for client prefill

## Module File Locations
All modules: `client/src/pages/modules/<module-name>/index.tsx`
Sub-services library: `client/src/lib/sub-services.ts`
Company services: `client/src/lib/company-services.ts`

# Scapex — Smart Business Management Platform (ERP)

## Architecture
- **Frontend**: React + TypeScript + Vite, wouter routing, shadcn/ui + Tailwind CSS
- **Backend**: Express (port 5000) — currently serving as proxy; all data is localStorage
- **Languages**: Full Arabic (RTL) + English (LTR) bilingual — toggled via `useLanguage()` hook
- **Auth**: localStorage-based sessions with RBAC + multi-activity permissions

## Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@scapex.sa | Admin@123 |
| Manager | manager@scapex.sa | Manager@123 |
| Accountant | accountant@scapex.sa | Account@123 |
| Engineer | engineer@scapex.sa | Engineer@123 |

## Key Storage Keys
- `scapex_proposals` — all proposals (JSON array)
- `scapex_contracts` — all generated contracts (JSON array)
- `scapex_activities` — business activities config (version: v2)
- `users` — user accounts (version: v3)
- `scapex_proposal_prefill` — temporary CRM/Sales→Proposal prefill data
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

## Modules — All Built & Functional

### Core & Analytics
- **Dashboard** (`/dashboard`) — Overview, KPIs, recent activity
- **BI Analytics** (`/bi`) — Revenue charts, service breakdown, top clients, KPI bars
- **AI Control Center** (`/ai-control`) — AI insights, automation rules

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
- **Government Entities** (`/government`) — Permits, licenses, expiry tracking (CRUD)
- **Smart Proposal Generator** (`/smart-proposal`) — Full AI-powered system with Market Benchmark pricing

### Human Resources
- **HR** (`/hr`) — Employee directory, departments, CRUD with Saudi-specific fields
- **Payroll** (`/payroll`) — Salary batches, payslips, GOSI deductions
- **GPS Attendance** (`/attendance`) — Daily attendance log, leave requests with approval flow
- **HSE** (`/hse`) — Incident reports, safety inspections, PPE tracking

### System & Portals
- **DMS** (`/dms`) — Document storage, versioning, access control (CRUD)
- **Client Portal** (`/client-portal`) — Client self-service
- **Users** (`/users`) — User management
- **System Admin** (`/system-admin`) — Platform configuration

### Placeholder (to complete)
- Approvals, Mobile App, Companies (multi-tenant management)

## Smart Proposal Generator Features
- **6 service type templates**: Engineering Consulting, Environmental, Safety Consulting, Safety Services, Contracting, Metal Recycling
- **AI item generation**: Auto-generates bilingual (AR/EN) line items with Saudi market pricing
- **Price suggestions**: Historical price analytics from past proposals (min/avg/max + item suggestions)
- **3-step create wizard**: Service type → Client info → Project details (skips client info when CRM prefill exists)
- **Status workflow**: Draft → Sent → Approved → Contract/Invoice
- **Contract generation**: Auto-generates 8-article bilingual legal contract with payment schedule
- **PDF printing**: `printProposal()` and `printContract()` generate styled HTML + auto-print
- **CRM/Sales integration**: `scapex_proposal_prefill` localStorage key for client prefill
- **CRM Banner**: Step 1 shows green banner with pre-filled client name when arriving from Pipeline

## Proposal→Contract→Invoice Flow
1. Create proposal (AI-generated or manual)
2. Send to client (status: sent)
3. Approve (status: approved)
4. Convert to Contract → generates Contract with 8 bilingual legal articles + payment milestones
5. Contract PDF printout with Saudi law clauses + signature areas
6. OR Convert to Invoice → generates invoice number for Accounting module

## CRM Integration
- "Create Proposal" button in header navigates to Smart Proposal
- Each customer row has a proposal shortcut button (prefills client name, email, phone)
- Each pipeline lead card has a "Proposal" shortcut button (prefills client name + skips step 2)

## Service Types
`eng_consulting` | `environmental` | `safety_consulting` | `safety_services` | `contracting` | `metal_recycling`

## Module File Locations
All modules: `client/src/pages/modules/<module-name>/index.tsx`

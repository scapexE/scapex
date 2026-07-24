# Scapex — Smart Business Management Platform (ERP)

## User Preferences
- **Communication**: Always respond in Arabic. After finishing ANY task, always give the user a clear summary of all actions taken (what changed, where, and whether it was deployed).
- **Design Philosophy**: Build every feature as an advanced version of Odoo + SAP — professional, data-rich, contextual. Centralized data, multiple access points, no duplication.
- **Document Storage**: All file content stored in PostgreSQL as base64 (TEXT column `file_content`). Max 15MB per file. Documents shared by `contact_id` (company-level) or `deal_id` (deal-specific).
- **CRM Documents**: Use the unified `documents` table with `contact_id`/`deal_id` columns — accessible from both CRM Drawer and DMS module. No separate document store.

## Architecture
- **Version**: Auto-incremented via `version.json` — patch number bumps on every `npm run build` (deploy). Injected into frontend via Vite `define` as `__APP_VERSION__`. Displayed only in sidebar footer.
- **Frontend**: React + TypeScript + Vite, wouter routing, shadcn/ui + Tailwind CSS
- **Backend**: Express (port 5000) — serves API routes + static files
- **Database**: PostgreSQL with Drizzle ORM — 62 tables covering all modules
- **DB Connection**: `server/db.ts` — pooled connection via `DATABASE_URL`
- **Schema**: `shared/schema.ts` — comprehensive schema with multi-tenant support (`company_id` on all tables)
- **Languages**: Full Arabic (RTL) + English (LTR) bilingual — toggled via `useLanguage()` hook
- **Data Storage**: All `scapex_*` data stored in PostgreSQL `app_data` table (key-value JSONB), synced to/from localStorage as cache via `client/src/lib/dbStorage.ts`
- **Companies & Branches**: Fully migrated to PostgreSQL via REST API (`/api/companies`, `/api/branches`). Seed data auto-populates on first boot. Company Settings syncs main company (type="main") to DB on save. Settings merge-preserved on updates.
- **Auth**: Session in localStorage (non-scapex key), RBAC + multi-activity permissions + real email verification via Resend
- **Dark Mode**: Full dark/light mode with clear card borders and distinct background/card contrast
- **Client Portal**: 6 color themes (Default, Ocean, Forest, Royal, Sunset, Slate) + dark mode toggle
- **Auth Features**: Forgot password (verification code), real email verification on registration (Resend integration), admin approval flow
- **Email Verification**: `server/email.ts` — Resend connector sends 6-digit code on registration; server-side enforcement (register blocked without verified email); rate limiting (60s cooldown), max 5 attempts, 10-min expiry, 15-min verified window

## Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@scapex.sa | Admin@123 |
| Manager | manager@scapex.sa | Manager@123 |
| Accountant | accountant@scapex.sa | Account@123 |
| Engineer | engineer@scapex.sa | Engineer@123 |

## Database Schema (62 Tables)

### Core/System (8)
companies, branches, users, roles, audit_logs, notifications, app_data

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
- `scapex_proposals` — proposals cache (DB is source of truth via /api/proposals; hydrated on load, write-through on save)
- `scapex_contracts` — contracts cache (DB is source of truth via /api/contracts; hydrated on load, write-through on save)
- `scapex_activities` — business activities config (version: v2)
- `users` — user accounts (version: v3)
- `scapex_proposal_prefill` — temporary CRM/Sales→Proposal prefill data
- `scapex_invoice_prefill` — temporary CRM→Invoice prefill (deal drawer «إصدار فاتورة» → /accounting?tab=invoices&new=1; consumed only when ?new=1)
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
- `scapex_audit_log` — user activity audit log (max 500 entries)
- `scapex_notifications` — in-app notifications
- `scapex_notifications_seeded` — demo notification seed flag
- `scapex_about_settings` — central company settings (name, address, contacts, VAT, CR, branches, social media) — single source of truth for all system company data
- `scapex_system_settings` — GLOBAL system settings (time format 12h/24h, date format gregorian/hijri/both, font family, font size, print template footers/headers). The global key drives the live UI (font/date/print) for the primary company.
- `scapex_system_settings::<companyId>` — PER-COMPANY system settings + print templates. Written when saving a specific company's settings in the Company Management → "Company Info & Settings" tab. `getSystemSettings(companyId?)` falls back to the global key when no per-company record exists; saving the main company also mirrors to the global key (`alsoGlobal`).
- `scapex_signatures` — electronic signature records per document (proposal/contract) per party
- `scapex_default_signature` — saved default signature image for quick reuse

## Modules — 17 Active Modules

### Core & Analytics
- **Dashboard** (`/dashboard`) — Overview, KPIs, recent activity
- **BI Analytics** (`/bi`) — Revenue charts, service breakdown, top clients, KPI bars
- **AI Insights (contextual)** — old `/ai-control` module deleted (redirects to dashboard). Real rule-based insights via `GET /api/ai/insights` (stale deals >30d, overdue invoices/installments, expiring docs/permits, iqama/insurance expiry, low stock, revenue trend), rendered by shared `AIInsightsPanel` inside Dashboard, BI, and CRM. Admin on/off toggle in System Admin (`/api/ai/settings`, stored in app_data key `scapex_ai_settings`). BI/Dashboard financials come from real `GET /api/analytics/finance` (payments + invoices) — no mock numbers.
- **Company Management** (`/companies`) — Multi-tenant: companies, branches, org structure
- **Company Info & Settings** — Merged into Company Management (`/companies`) as a dedicated tab ("معلومات وإعدادات الشركة"). Per-company: identity/description/working-hours/social (معلومات الشركة), system settings — branding/time/date/font (إعدادات النظام), and print templates — footers/headers (قوالب الطباعة). The old standalone `/company-settings` route now redirects to `/companies`. Component: `client/src/components/companies/CompanySettingsPanel.tsx`.

### Business & Finance
- **CRM** (`/crm`) — Pipeline board + Customers list + Dashboard
- **Sales** (`/sales`) — Quotations + Contracts
- **Purchases** (`/purchases`) — Purchase orders + Vendor management (CRUD). Sales-level: unified ZATCA print (QR/watermark/preparedBy), approval flow (draft→pending_approval→approved→sent→partial/received; approve/reject admin+manager only), items editor with optional inventory linkage + auto 15% VAT, receive creates stock "in" movements transactionally, vendor payment schedules (`po_payment_schedules`) with سند صرف linkage (payments.poId/poScheduleId, recompute pattern) + overdue/due-soon alerts (table icons + notifications sweep). Schedule dialog: `client/src/components/purchases/PoScheduleDialog.tsx`.
- **Accounting** (`/accounting`) — Financial views, invoices

### Operations
- **Projects** (`/projects`) — Project tracking
- **Inventory** (`/inventory`) — Stock items, warehouses, movements (CRUD)
- **Equipment & Fleet** (`/equipment`) — Assets, vehicles, maintenance logs (CRUD)

### Human Resources
- **HR** (`/hr`) — Employee directory, departments, CRUD with Saudi-specific fields
- **Payroll** (`/payroll`) — Salary batches, payslips, GOSI deductions
- **GPS Attendance** (`/attendance`) — Daily attendance log, leave requests with approval flow
- **HSE** (`/hse`) — Incident reports, safety inspections, PPE tracking
- **Engineers Mobile App** (`/mobile-app`) — Device management, site reports, live map, feature toggles

### Reports & Logs
- **Activity Log** (`/audit-log`) — Full user activity tracking: login/logout, page visits, CRUD actions. Filterable by action/module/user with search. Export to CSV and PDF. Clear log restricted to admin.

### System & Portals
- **DMS** (`/dms`) — Document storage, versioning, access control (CRUD)
- **Client Portal** (`/client-portal`) — Client self-service
- **Users** (`/users`) — User management
- **System Admin** (`/system-admin`) — Platform configuration
- **About** (`/about`) — Company info, contact details, social links, support ticket form, technical system info. Visible to all users.

## New Features
- **Audit Log System** (`client/src/lib/auditLog.ts`) — Tracks login/logout, page visits, CRUD operations. Max 500 entries per browser.
- **Notifications System** (`client/src/lib/notifications.ts`) — In-app notification bell with real-time badge count, mark as read, clear all. Demo notifications seeded once.
- **PDF Export** (`client/src/lib/pdfExport.ts`) — Print-ready HTML reports with Scapex branding, bilingual support, HTML escaping.
- **Enhanced Dashboard** — Shows total users, active modules, today's actions, system health. Includes recent activity log and action distribution chart.

## Module File Locations
All modules: `client/src/pages/modules/<module-name>/index.tsx`
Sub-services library: `client/src/lib/sub-services.ts`
Company services: `client/src/lib/company-services.ts`
Company settings data layer: `client/src/lib/companySettings.ts` — central types, defaults, getAboutData(), saveAboutData()

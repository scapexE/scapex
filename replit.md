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

## Modules
### Built & Functional
- **Smart Proposal Generator** (`/smart-proposal`) — Full AI-powered system
- **CRM** (`/crm`) — Pipeline board + Customers list + Dashboard
- **Sales** (`/sales`) — Quotations (linked to proposals) + Contracts
- **Accounting** (`/accounting`) — Basic financial views
- **Projects** (`/projects`) — Project tracking
- **Client Portal** (`/client-portal`) — Client self-service

### Placeholder Modules
Purchases, Inventory, Equipment, Engineering, HR, Payroll, Attendance, HSE, DMS, Government, BI, AI Control, Companies

## Smart Proposal Generator Features
- **6 service type templates**: Engineering Consulting, Environmental, Safety Consulting, Safety Services, Contracting, Metal Recycling
- **AI item generation**: Auto-generates bilingual (AR/EN) line items with Saudi market pricing
- **Price suggestions**: Historical price analytics from past proposals (min/avg/max + item suggestions)
- **3-step create wizard**: Service type → Client info → Project details
- **Status workflow**: Draft → Sent → Approved → Contract/Invoice
- **Contract generation**: Auto-generates 8-article bilingual legal contract with payment schedule
- **PDF printing**: `printProposal()` and `printContract()` generate styled HTML + auto-print
- **CRM/Sales integration**: `scapex_proposal_prefill` localStorage key for client prefill

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
- Each pipeline lead card has a "Proposal" shortcut button (prefills client name)

## Sales Integration
- Quotations tab shows all proposals from `scapex_proposals`
- "Create Proposal" button navigates to Smart Proposal module

## Proposal Number Format
- Proposals: `PRO-{year}-{####}`
- Contracts: `CON-{year}-{####}`
- Invoices: `INV-{year}-{####}`

## Service Types
`eng_consulting` | `environmental` | `safety_consulting` | `safety_services` | `contracting` | `metal_recycling`

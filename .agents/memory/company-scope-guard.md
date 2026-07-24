---
name: Company scope guard
description: How multi-company read scoping works for staff API routes (invoices, employees, permits, analytics…)
---

Rule: staff read routes for company-owned records must go through `resolveCompanyScope()` + `companyScoped()` (server/routes.ts) — never return raw table dumps.

**Why:** several GET routes (invoices, employees, journal-entries, permits, gov entities, safety trainings, analytics summary) leaked all companies' rows to any authenticated staff user; and `:id` detail/PUT/DELETE routes were IDOR-able even after the list was scoped.

**How to apply:**
- Non-privileged users' allowed companyIds derive from their activity memberships (activity → companyId). Admin/manager unrestricted (`companyIds: null`).
- Legacy rows with `companyId == null` are treated as primary-company and stay visible — filtering them out blanks existing modules.
- When scoping a list route, always also scope the `:id` GET/PUT/DELETE (return 404, not 403, to avoid ID probing).
- Client callers must use `scopedFetch` (injects x-session-token); raw `fetch()` to a newly-guarded endpoint silently 401s and the UI shows empty data.

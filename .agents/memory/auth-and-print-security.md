---
name: auth and print security model
description: How staff auth, RBAC, and print/PDF XSS escaping work in Scapex ERP — the rules to keep new code consistent
---

## Staff auth = signed session tokens (not x-user-id)
- Server identifies staff ONLY via a verified `x-session-token` (HMAC-SHA256). The global `/api/*` guard verifies it and stashes the id; route code reads it via `staffUserId(req)`.
- **Why:** `x-user-id` was trusted and forgeable → full impersonation. Never reintroduce header-based identity. Any new staff route must rely on `staffUserId(req)`, never on a client-supplied id field.
- Frontend sends the token by patching `fetch` (stored in localStorage under the session-token key). Login response shape is `{ user, token }`.

## RBAC on module mutations
- Privileged module mutations (HR, Inventory, Vendors, Purchase Orders, Assets/Maintenance, Payroll, advances/violations) gate with `if (!(await isAdminOrManager(req))) return res.status(403)` at handler entry.
- **Why:** these routes previously accepted any authenticated staff. Roles admin/manager are privileged; accountant/engineer are not.
- **How to apply:** when adding a new mutating module route, add the same guard as the first line.

## Print/PDF XSS escaping rule
- Every print/PDF helper builds an HTML string and renders it via `window.open` + `document.write`, which executes scripts. ALL user-controlled string fields interpolated into that HTML MUST be wrapped with `esc()` from `client/src/lib/htmlEscape.ts`.
- **Why:** stored XSS — names, notes, descriptions, AND free-text `unit` fields (unit is a free-text input, not an enum) were rendered raw.
- **How to apply:** safe to leave unescaped only: numbers, dates, true enums/status validated server-side, base64 signature data URLs, and hardcoded labels. Everything else (including `unit`) → `esc()`. `pdfExport.ts` has its own internal `escapeHtml` and is already safe.

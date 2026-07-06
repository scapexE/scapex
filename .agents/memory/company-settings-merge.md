---
name: Company settings merge & per-company system settings
description: Where per-company system settings/print templates live and how the global key still drives the live UI.
---

# Company Settings merged into Company Management

The standalone Company Settings module was merged into Company Management (`/companies`) as a tab. There is no separate `/company-settings` module — that route redirects to `/companies`.

## Per-company system settings key
- `getSystemSettings(companyId?)` / `saveSystemSettings(data, {companyId, alsoGlobal})` in `client/src/lib/companySettings.ts`.
- Per-company data is stored under `scapex_system_settings::<companyId>`; the no-arg global key `scapex_system_settings` is still the primary/live UI source (font/date/print) and is used by no-arg callers.
- **Why:** user decision — each company has its own logo/name/print templates, but the live app chrome (font size, date format) must keep working off one global record for the primary company to avoid regressions.
- **How to apply:** reading settings for a specific company → pass `companyId`; it falls back to the global key when no per-company record exists. Saving the main company mirrors to the global key via `alsoGlobal`. Document/PDF branding (`proposals.ts`) still reads GLOBAL — making PDFs per-company is a deferred follow-up.

## wouter redirect gotcha (v3.9)
- A bare `<Route path="x"><Redirect to="y"/></Route>` child did NOT reliably navigate in this app; use a dedicated component via the `component={}` prop instead (`<Route path="x" component={XRedirect} />` where `XRedirect` returns `<Redirect to="y"/>`).

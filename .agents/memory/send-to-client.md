---
name: Send document copies to client
description: Email + client portal document sending conventions
---

- Contacts REST endpoint is `/api/customers` (staff-scoped via scopedFetch); there is NO `/api/contacts` route.
- **Why:** SendToClientDialog silently showed an empty picker when pointed at the wrong route, blocking portal sends.
- **How to apply:** any UI needing a client picker should fetch `/api/customers` and map {id,nameAr,nameEn,email}.
- Printable documents use `build*Html()` pure functions returning strings; `print*` wrappers open a window. Sending (email/portal) reuses the same builder so printed and sent copies stay identical, incl. the user-selected print language.

## English document rendering
- Client English names are NOT stored on proposals/contracts. English/both-language docs resolve nameEn at render time via GET /api/customers (match crmContactId, else exact nameAr/nameEn match). Use the async `buildProposalHtmlWithNames`/`buildContractHtmlWithNames` wrappers everywhere (print, view, send) — never call the sync builders directly from UI, or Arabic names leak into English docs.
- Popup blockers: open the print window synchronously, then write HTML after the async name fetch resolves.

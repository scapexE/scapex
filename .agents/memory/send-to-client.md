---
name: Send document copies to client
description: Email + client portal document sending conventions
---

- Contacts REST endpoint is `/api/customers` (staff-scoped via scopedFetch); there is NO `/api/contacts` route.
- **Why:** SendToClientDialog silently showed an empty picker when pointed at the wrong route, blocking portal sends.
- **How to apply:** any UI needing a client picker should fetch `/api/customers` and map {id,nameAr,nameEn,email}.
- Printable documents use `build*Html()` pure functions returning strings; `print*` wrappers open a window. Sending (email/portal) reuses the same builder so printed and sent copies stay identical, incl. the user-selected print language.

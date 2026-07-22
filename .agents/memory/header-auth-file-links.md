---
name: Header-auth breaks plain file links
description: Why file view/download must use fetch + blob URLs in this app
---

Staff auth is enforced via the `x-session-token` header, injected only by the global fetch wrapper in `client/src/main.tsx`. Browser navigations (`window.open(url)`, `<a href>` downloads) never carry that header and get 401.

**Why:** discovered when DMS view/download buttons hit `/api/documents/:id/file` directly and failed for logged-in users.

**How to apply:** any endpoint returning binary/file content that users open or download must be consumed client-side via `fetch()` → `blob()` → `URL.createObjectURL`, never a raw link. Alternatively switch to cookie auth for such endpoints.

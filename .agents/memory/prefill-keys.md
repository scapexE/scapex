---
name: Cross-page prefill keys
description: How scapex_*_prefill handoff keys must be consumed to avoid stale re-triggering
---

Rule: a `scapex_*_prefill` key written before navigation must be consumed only when an explicit URL signal (e.g. `?new=1`) is present, then removed immediately.

**Why:** dbStorage keys are synced to the server (`app_data`) asynchronously. `initDbStorage()`'s background sync can resolve after the consumer removed the key and re-write the stale payload into localStorage — the next mount of the consumer would auto-open a dialog with old data. Gating on a URL param kills the race because a normal visit lacks the param.

**How to apply:** any new CRM→module handoff (invoice, contract, proposal prefill): writer sets the key + navigates with the trigger param; consumer checks the param first, then dbGetItem + dbRemoveItem. Note `scapex_contract_prefill` predates this rule and still has the flaw.

Related: the invoices list endpoint returns no line items; any print/email/edit path must fetch `/api/invoices/:id` to get items first.

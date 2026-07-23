---
name: Journal entries design
description: Double-entry bookkeeping rules for the accounting module (posting, balances, numbering)
---

- Posted journal entries are immutable (no edit/delete); account balances are applied only at posting time via atomic SQL increments (`balance = balance + delta`), never read-modify-write.
- **Why:** prevents lost updates under concurrent postings and keeps the ledger auditable.
- Balance sign convention: asset/expense grow by (debit − credit); liability/equity/revenue by (credit − debit).
- Entry numbering `JE-<year>-NNNN` is serialized with `pg_advisory_xact_lock(874512, companyId)` + MAX(suffix) inside the create transaction — count-based numbering duplicates under concurrency/deletes.
- UI only offers leaf accounts (no children) as postable lines; parent accounts are grouping-only.
- `createdBy`/`approvedBy` must come from the server session (`staffUserId(req)`), never from the request body.

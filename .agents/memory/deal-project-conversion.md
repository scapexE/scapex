---
name: Deal → project auto-conversion
description: How won deals become projects and how their documents follow
---
Rule: when a deal's stage transitions to "won" (PATCH /api/deals/:id), the server auto-creates one linked project (projects.deal_id, partial unique index projects_deal_id_uniq) and re-links the deal's documents (documents.deal_id → project_id) inside a transaction.

**Why:** user chose Odoo-style flow (sales = pre-contract, projects = execution); deal docs must surface under project docs in the customer card.

**How to apply:** any new path that changes deal stage to "won" must go through the PATCH route (or replicate the conversion); never create a second project for a deal — the unique index will reject it. Schema changes need matching ALTERs on the prod VPS DB (no migration tool).

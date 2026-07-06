---
name: Payment ↔ contract installment linkage
description: How receipt vouchers (payments) and contract_payment_schedules installments stay in sync bidirectionally.
---

# Payment ↔ Contract Installment Linkage

`POST /api/payments` is the SINGLE source of truth for both directions:
- Recording a voucher against an installment (from PaymentsTab) and marking an installment paid
  (from ContractPaymentSchedule) BOTH create a payment row; the server then updates the linked
  installment. The schedule UI no longer PUTs paidAmount directly — this avoids update loops.

Link columns: `payments.schedule_id` + `payments.contract_ref`; `contract_payment_schedules.payment_id`
(convenience pointer to the latest linked voucher).

**Rule:** an installment's `paid_amount`/`status`/`payment_id` are RECOMPUTED from all its linked
received vouchers (`recomputeInstallmentFromPayments(scheduleId)`), never mutated incrementally.

**Why:** create capped paid_amount at the installment total (`Math.min(sum, due)`) while delete used to
subtract the full voucher amount — asymmetric, so deleting an overpayment voucher corrupted the balance.
Deriving from the sum of remaining vouchers keeps create/delete symmetric, idempotent, and self-healing,
and always resets `payment_id` to the latest remaining voucher (or null).

**How to apply:** any new mutation that affects a voucher-installment link should call the recompute
helper rather than adjusting paid_amount by a delta. Validate `scheduleId` exists (reject 400) before
inserting a linked payment to prevent dangling links.

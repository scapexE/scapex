---
name: CRM survey/email design decisions
description: Why the CRM Email/Survey feature diverges from its written session plan — to prevent future agents re-adding redundant structures.
---

# CRM Email / WhatsApp / Survey — design decisions

A session plan asked for a standalone `sendBulkEmail(from,to[],subject,html,bcc?)`
helper and a `survey_question_sets` DB table. Neither was created. Both are
intentionally satisfied by other means:

- **Bulk email**: handled inline in `POST /api/email/send` — when `isBulk`, all
  real recipients go into BCC and `to` is set to the sender address (privacy:
  recipients never see each other). `sendEmail()` in `server/email.ts` already
  supports `bcc`. Every send is logged to the `email_logs` table.
  **Why:** a separate helper would just wrap `sendEmail` with no added value.

- **Survey questions**: the editable question *template* persists to the
  `app_data` key-value table (key `scapex_survey_questions`); each survey snapshots
  its chosen questions into the `surveys.questions` JSONB column at send time.
  **Why:** snapshotting per-survey is correct (template edits must not mutate
  already-sent surveys); a dedicated `survey_question_sets` table is unused dead
  structure.

**How to apply:** if a future task says these are "missing", they are not — the
functionality exists. Do not add a `survey_question_sets` table or a redundant
`sendBulkEmail` wrapper without a concrete new requirement.

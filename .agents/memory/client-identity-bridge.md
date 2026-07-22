---
name: Client identity bridge
description: How registered clients (users table) and portal customers (contacts table) are linked
---
Two identity systems: staff/registered users in `users` (main login, email+password) vs portal clients in `contacts` (portal login, nationalId+password).

**Rule:** `/api/auth/register` bridges into `contacts` — matched strictly by verified email, NEVER by nationalId (prevents portal account takeover). Registration returns 409 if the nationalId belongs to a contact with a different email. Existing `portalPasswordHash` is never overwritten by registration.

**Why:** architect review flagged an account-takeover path when bridging matched by nationalId and reset portal credentials unconditionally.

**How to apply:** any future flow that links a user to a contact must prove ownership via the verified email, and must not mutate existing portal credentials.

Also: dev has no RESEND_API_KEY — register has a dev-only email-verification bypass (`NODE_ENV==='development' && !RESEND_API_KEY`). Prod admin accounts are real Gmail accounts, NOT the dev demo credentials (admin@scapex.sa exists only in dev).

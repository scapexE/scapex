---
name: Portal signing OTP channels (email vs SMS)
description: Why the client-portal signing step offers email OTP by default and treats SMS as optional
---

## Decision
The client-portal signing step (contract sign / proposal approve) lets the client pick the OTP channel: **email (default)** or **SMS**. The OTP code is stored server-side in one shared store keyed by contactId, so verification is identical regardless of which channel sent it.

**Why:** SMS delivery needs a *paid* provider (Twilio / a Saudi gateway like Unifonic/Taqnyat) — it is NOT configured. Resend (email) IS configured and free-tier sufficient, so email is the only channel that actually delivers today. SMS stays wired up for when the user subscribes to an SMS provider.

**How to apply:**
- Resend can only send email — it can never send SMS. Do not suggest Resend for phone OTP.
- Portal clients always have a phone (required at registration), so never skip OTP entirely on the "no phone" assumption. The real constraint is *delivery cost*, not phone presence.
- `devCode` (the OTP echoed back in the API response for testing) must stay gated behind `NODE_ENV !== "production"`. In production, if email delivery fails or SMS has no provider, return NO code (fail-closed) rather than leaking it.

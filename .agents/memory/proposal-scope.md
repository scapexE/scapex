---
name: Proposal crmContactId scope pattern
description: ProposalDetail is a top-level function, not nested inside CreateProposal, so it has no closure access to CreateProposal state variables.
---

## Rule
Never reference CreateProposal state variables (crmContactId, crmDealId, etc.) from ProposalDetail.

**Why:** ProposalDetail is defined as a sibling function at module scope, not nested inside CreateProposal. JavaScript closures don't apply across sibling function definitions. TypeScript TS2304 "Cannot find name" errors are the symptom.

**How to apply:** Any data CreateProposal needs to pass to ProposalDetail must be stored in the Proposal object itself (e.g., `crmContactId?: number` field on the Proposal interface) and set during proposal creation. ProposalDetail then reads from `proposal.crmContactId`.

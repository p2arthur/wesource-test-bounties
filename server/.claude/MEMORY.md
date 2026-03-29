# Backend Dev Agent — MEMORY.md

**Last Updated:** 2026-03-28
**Project:** WeSource — Algorand bounty platform

---

## Milestones

<!-- Log each completed task here with date and brief note -->
<!-- Format: ### [DATE] Task X.Y — Brief description
- What was done
- Key decisions made
- Tests passing (Y/N)
- Any issues found in other layers (flagged, not fixed) -->

_Starting Phase 2 — Type Alignment. No milestones yet._

---

## Major Findings

<!-- Log discoveries here: unexpected behavior, Prisma quirks, NestJS gotchas, Algorand SDK issues, etc. -->
<!-- Reference PLAN.md tasks when a finding relates to a specific task -->

_No findings yet._

---

## Decisions Log

<!-- Record every "why I did it this way" decision -->
<!-- This is your memory across sessions — write it down or lose it -->

_No decisions yet._

---

## Cross-Layer Notes

<!-- When testing reveals issues in contract or frontend code, log them here -->
<!-- Don't fix them — that's their job. But document so p2 knows. -->

_No cross-layer notes yet._

---

## Error Log

<!-- When you hit an error: write the error, explain WHY it happened, then note the fix -->
<!-- This is your debugging journal — future-you will thank present-you -->

_No errors yet._

---

## Reference

- **Audit:** `WeSource_full_audit/audit_results/CURRENT_FEATURES.md`
- **Plan:** `WeSource_full_audit/audit_results/CORE_FEATURES_PLAN.md` (Phases 2–7)
- **Executive Plan:** `WESOURCE_EXECUTIVE_PLAN.md`
- **ARC-56 Spec:** `contracts/artifacts/source_factory/SourceFactory.arc56.json` ← READ THIS before calling contract methods
- **Schema:** `prisma/schema.prisma`
- **Key files:** `src/bounties/bounties.service.ts`, `src/algorand/algorand.service.ts`, `src/oracle/oracle.service.ts`
- **On-Chain agent plan:** `../../contracts/.opencode/PLAN.md` (to understand contract changes)
- **Frontend agent plan:** `../../client/.opencode/PLAN.md` (to understand what they expect from your API)

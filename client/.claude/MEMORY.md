# Frontend Dev Agent — MEMORY.md

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

_Waiting for Backend Phase 3 (auth) before starting Phase 3 UI work. Can start Task 4.1 (fix claim button) and Task 5.1 (refund UI) early — pure UI, no backend dependency._

---

## Major Findings

<!-- Log discoveries here: unexpected behavior, React quirks, Tailwind gotchas, wallet SDK issues, etc. -->
<!-- Reference PLAN.md tasks when a finding relates to a specific task -->

_No findings yet._

---

## Decisions Log

<!-- Record every "why I did it this way" decision -->
<!-- This is your memory across sessions — write it down or lose it -->

_No decisions yet._

---

## Cross-Layer Notes

<!-- When testing reveals issues in contract or backend code, log them here -->
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
- **Plan:** `WeSource_full_audit/audit_results/CORE_FEATURES_PLAN.md` (Phases 3–7)
- **Executive Plan:** `WESOURCE_EXECUTIVE_PLAN.md`
- **Generated client:** `src/contracts/SourceFactoryClient.ts` ← On-Chain provides this
- **API client:** `src/services/api.ts`
- **Transaction builder:** `src/services/bountyContract.ts`
- **Key pages:** `src/pages/BountyPage.tsx`, `src/pages/ProfilePage.tsx`, `src/pages/Home.tsx`
- **Backend agent plan:** `../../server/.opencode/PLAN.md` (to understand API contract)
- **On-Chain agent plan:** `../../contracts/.opencode/PLAN.md` (to understand contract methods)

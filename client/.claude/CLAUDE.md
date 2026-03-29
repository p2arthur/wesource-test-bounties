# CLAUDE.md — Frontend Dev (Functional MVP)

**Role:** Frontend Engineer — React/Vite/Tailwind/shadcn/ui
**Scope:** `/client` — functional implementation: auth, claim, refund, profiles
**Project:** WeSource — decentralized bounty platform on Algorand
**Working Branch:** `feat/ui-overhaul` (UI already done, functional work goes on top)

---

## 🌍 FIRST: Read Context

Before doing ANYTHING:
1. Read `.claude/MEMORY.md` — your history
2. Read `.claude/PLAN.md` — your task list (Phases 3–7)

---

## Identity

You are the Frontend Dev agent for WeSource. The UI overhaul (R1 "Night & Day") is complete — dark theme, shadcn/ui, Inter font, all 7 stages done. Now you're building the **functional features**: authentication, claim flow, refund flow, user profiles, search/pagination/notifications.

---

## What's Already Done

### UI Overhaul ✅
- Dark theme, shadcn/ui components, Inter font, react-icons
- All pages restyled: Home, ProjectPage, BountyPage, ProfilePage
- All components restyled: BountyCard, ProjectCard, VoteWidget, etc.
- All modals restyled: ConnectWallet, WalletLink, CreateBounty, SubmitProject
- 7 stages, 9 commits on `feat/ui-overhaul`

### Backend (Phases 1–5 ✅)
- **Phase 1-3:** On-chain contract, types, auth guards (JWT + wallet signature)
- **Phase 4:** Claim endpoint fixed (DTO + wallet check), 53/53 tests
- **Phase 5:** Refund/revoke endpoints — `POST /api/bounties/:id/refund` and `/revoke`
- `GET /users/:walletAddress` — user profile data
- `POST /bounties/link-wallet` — wallet↔GitHub linking
- Auth: wallet-signed JWT required for mutating endpoints

### On-Chain ✅
- New `SourceFactoryClient.ts` with `claim`, `refund_bounty`, `revoke_bounty` methods
- Box references for bounty lookups

---

## What You're Building (Phases 3–7)

### Phase 3: Authentication UI
- `useAuth` hook — wallet → sign → JWT flow
- GitHub linking in WalletMenu
- Auth headers on mutating API calls

### Phase 4: Claim Flow UI
- Fix claim button logic (READY_FOR_CLAIM + isWinner only)
- `claimBountyOnChain` function
- End-to-end claim flow (backend → on-chain → UI update)

### Phase 5: Refund Flow UI
- Refund button for REFUNDABLE + isCreator
- Calls `POST /api/bounties/:id/refund`

### Phase 6: User Profiles
- ProfilePage with real data from `GET /users/:walletAddress`
- Real bounty count, win count

### Phase 7: Search, Pagination, Notifications
- Search bar + status filter on Home
- Pagination controls
- Notification bell in header

---

## Your Domain

```
client/src/
├── hooks/           ← NEW: useAuth.ts
├── services/        ← UPDATE: api.ts (auth headers), bountyContract.ts (claimBountyOnChain)
├── pages/           ← UPDATE: BountyPage (claim/refund), ProfilePage (real data), Home (search)
├── components/      ← UPDATE: HeaderBar (notification bell), WalletMenu (GitHub linking)
└── contexts/        ← UPDATE: if auth state needs global context
```

---

## What You Do NOT Touch

- `src/contracts/SourceFactoryClient.ts` — generated, never modify
- Backend or contract code — other agents' territory
- shadcn/ui components in `src/components/ui/` — already done, don't restyle
- The dark theme — it's done, don't change colors/layout

---

## Rules

1. **Amounts: send ALGO to API, microAlgos to contract.** Conversion is in `bountyContract.ts`.
2. **Claim button only for READY_FOR_CLAIM + isWinner.** Not for OPEN. Not for everyone.
3. **Refund button only for REFUNDABLE + isCreator.** Only the funder can reclaim.
4. **Auth: send wallet signature with mutating requests.** Backend returns 401 without it.
5. **Test every state.** Loading, error, empty, success, unauthorized.
6. **`npm run build` must pass** after every phase.
7. **Commit after every phase.**
8. **Document decisions in MEMORY.md.**

---

## Reference

- **PLAN.md:** `.claude/PLAN.md` — your task checklist
- **SourceFactoryClient:** `src/contracts/SourceFactoryClient.ts`
- **API client:** `src/services/api.ts`
- **Transaction builder:** `src/services/bountyContract.ts`
- **Backend agent plan:** `../../server/.opencode/PLAN.md` (API contract reference)

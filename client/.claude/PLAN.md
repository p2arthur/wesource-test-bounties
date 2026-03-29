# Frontend Dev — Transaction History UI (Final MVP Feature)

**Status:** Last feature before MVP is declared done.
**Dependency:** Backend must complete Transaction model + endpoint first.
**Backend endpoint:** `GET /api/users/:walletAddress/transactions`

---

## Context

The audit flagged Transaction History (#10) as missing. The backend is implementing:
- `Transaction` model (walletAddress, type, bountyId, amount, createdAt)
- `GET /api/users/:walletAddress/transactions` endpoint

Response shape:
```json
[
  {
    "id": 1,
    "walletAddress": "ABCD...",
    "type": "BOUNTY_CREATED",
    "bountyId": 5,
    "amount": 1000000,
    "createdAt": "2026-03-29T...",
    "bounty": {
      "id": 5,
      "issueNumber": 42,
      "issueUrl": "https://github.com/org/repo/issues/42",
      "repository": { "githubUrl": "https://github.com/org/repo" }
    }
  }
]
```

Transaction types: `BOUNTY_CREATED`, `BOUNTY_CLAIMED`, `BOUNTY_REFUNDED`, `BOUNTY_REVOKED`, `BOUNTY_CANCELLED`

---

## Task: Activity Timeline on ProfilePage

### Step 1: Add API call
- [ ] Add `getUserTransactions(walletAddress)` to `src/services/api.ts`
- [ ] Calls `GET /api/users/:walletAddress/transactions`
- [ ] Commit

### Step 2: Activity Timeline Component
- [ ] Create `src/components/ActivityTimeline.tsx`
- [ ] Renders a vertical timeline of transactions
- [ ] Each row:
  - Icon based on type:
    - `BOUNTY_CREATED` → `FiPlusCircle` (orange)
    - `BOUNTY_CLAIMED` → `FiCheckCircle` (green)
    - `BOUNTY_REFUNDED` → `FiRotateCcw` (red)
    - `BOUNTY_REVOKED` → `FiXCircle` (red)
    - `BOUNTY_CANCELLED` → `FiXCircle` (gray)
  - Action text: "Created bounty for org/repo#42", "Claimed bounty for org/repo#42"
  - Amount in ALGO (convert microAlgos: `amount / 1_000_000`)
  - Relative timestamp: "2 hours ago", "yesterday"
  - Link to bounty page (if bounty exists)
- [ ] Loading state: skeleton
- [ ] Empty state: "No activity yet"
- [ ] Commit

### Step 3: Add to ProfilePage
- [ ] Import `ActivityTimeline` into `ProfilePage.tsx`
- [ ] Add section below the stats cards: "Recent Activity"
- [ ] Fetch transactions on mount (or on wallet connect)
- [ ] Commit

---

## Design Notes

- Use existing shadcn `Card` component for the container
- Dark theme colors already defined (accent #e8634a, success #3fb950, danger #f85149)
- Timeline line: subtle vertical line connecting events (CSS border-left on container)
- Each event: row with icon + text + amount + time
- Mobile: stack vertically, icons above text

---

## Rules

1. `npm run build` must pass
2. Commit after each step (3 commits total)
3. Don't touch backend code — that's the backend agent's job
4. Test with real data once backend endpoint is live
5. Document in `.claude/MEMORY.md`

---

## Reference

- **ProfilePage:** `src/pages/ProfilePage.tsx`
- **API client:** `src/services/api.ts`
- **Icons:** `react-icons/fi` (Feather)
- **shadcn components:** `src/components/ui/card.tsx`, `src/components/ui/skeleton.tsx`

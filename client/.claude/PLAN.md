# Frontend Dev — Phase 7.2 + 7.3 (Unblocked)

**Status:** Backend endpoints are now implemented and ready.
**What changed:**
- `GET /api/bounties?page=&limit=` — paginated response: `{ data, total, page, limit, totalPages }`
- `GET /projects?page=&limit=` — same shape
- `GET /api/users/:walletAddress` — returns `{ username, wallet, bountiesCreated, bountiesWon, joinedAt }`
- `GET /api/notifications?wallet=&page=&limit=` — paginated notifications
- `PATCH /api/notifications/:id/read` — mark as read
- `GET /api/notifications/unread-count?wallet=` — unread count

---

## Phase 6 Fix: Verify User Profiles

- [ ] Check that `src/services/api.ts` has `getUserProfile(walletAddress)` calling `GET /api/users/:walletAddress`
- [ ] Verify `ProfilePage.tsx` uses the real endpoint (not hardcoded)
- [ ] Test: navigate to profile → shows real bounty count, win count, joined date
- [ ] Commit if fix needed

---

## Phase 7.2: Pagination

### Task 7.2.1: Add Pagination to Home — Bounties List
- [ ] Update `Home.tsx` — bounties tab uses paginated API: `GET /api/bounties?page=&limit=20`
- [ ] Parse response: `{ data, total, page, limit, totalPages }`
- [ ] Add Previous/Next buttons below the bounty list
- [ ] Sync with URL params: `?page=2` persists on refresh
- [ ] Disable Previous on page 1, disable Next on last page
- [ ] Commit

### Task 7.2.2: Add Pagination to Home — Projects List
- [ ] Update `Home.tsx` — projects tab uses paginated API: `GET /projects?page=&limit=20`
- [ ] Same pagination UI pattern as bounties
- [ ] URL params: `?page=2` for whichever tab is active
- [ ] Commit

---

## Phase 7.3: Notifications

### Task 7.3.1: Notification Bell in HeaderBar
- [ ] Add bell icon to `HeaderBar.tsx` (use `react-icons/fi` — `FiBell`)
- [ ] Fetch unread count from `GET /api/notifications/unread-count?wallet=`
- [ ] Show red badge with count when > 0
- [ ] Refresh count on page navigation (or poll every 30s)
- [ ] Commit

### Task 7.3.2: Notification Dropdown
- [ ] On bell click, show dropdown with notifications from `GET /api/notifications?wallet=`
- [ ] Each notification: type icon, message, timestamp, read/unread styling
- [ ] Click notification → navigate to relevant bounty page
- [ ] Click → `PATCH /api/notifications/:id/read` to mark as read
- [ ] Update badge count after marking read
- [ ] Commit

---

## Rules

1. Commit after each task
2. `npm run build` must pass
3. Test at 375px, 768px, 1024px
4. Document decisions in `.claude/MEMORY.md`

---

## Reference

- **API client:** `src/services/api.ts` — add new endpoints here
- **HeaderBar:** `src/components/HeaderBar.tsx` — bell icon goes here
- **Home:** `src/Home.tsx` — pagination goes here
- **Backend endpoints:** All confirmed working, Swagger at `http://localhost:3000/api`

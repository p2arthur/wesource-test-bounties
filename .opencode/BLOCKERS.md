# Blockers & Dependencies

**Format:** [YYYY-MM-DD HH:MM] Worker blocked on dependency  
**Status:** blocked | resolved | escalated  
**ETA:** When dependency expected  
**Action:** What manager should do

---

## Current Blockers

### [2026-03-29 02:06] Frontend Task 4.2: Self-review overhead

**Worker:** frontend  
**Blocked on:** Excessive verification cycles (spawning subagents for spec review, code quality)  
**Reason:** Agent spending 60% time on self-management, 40% on coding  
**ETA:** Immediate  
**Action:** Manager takes over verification gates; worker becomes pure executor  
**Status:** ⚠️ escalating

### [2026-03-29 02:06] Frontend Task 4.3: API auth headers

**Worker:** frontend  
**Blocked on:** Task 4.2 (useUnifiedWallet signing)  
**Reason:** Need signLoginMessage method before auth headers can be built  
**ETA:** After Task 4.2 completion  
**Action:** Complete Task 4.2 first  
**Status:** blocked

### [2026-03-29 02:06] Frontend Task 4.6: Claim button logic

**Worker:** frontend  
**Blocked on:** Backend claim endpoint (POST /api/bounties/claim)  
**Reason:** Claim flow needs backend validation before on-chain call  
**ETA:** Backend Phase 4 shows "Claim Flow Complete" - endpoint exists  
**Action:** Verify backend claim endpoint is working  
**Status:** ⏳ verifying

### [2026-03-29 02:06] Frontend Task 4.7: MicroAlgos conversion

**Worker:** frontend  
**Blocked on:** Backend returning microAlgos in API responses  
**Reason:** Phase 2 (type alignment) completed - backend now returns microAlgos  
**Action:** Confirm API responses have microAlgos amounts  
**Status:** ⏳ verifying

## Dependency Graph

```
Frontend Phase 4
├── 4.2: useUnifiedWallet signing
│   └── Depends on: Backend wallet linking endpoint (✅ DONE)
├── 4.3: API auth headers
│   └── Depends on: 4.2
├── 4.4: useX402Fetch hook
│   └── Depends on: 4.3
├── 4.5: useAuth hook
│   └── Depends on: 4.2 + 4.3
├── 4.6: Claim button
│   └── Depends on: Backend claim endpoint (✅ DONE) + 4.5
└── 4.7: MicroAlgos conversion
    └── Depends on: Backend returning microAlgos (✅ DONE)

Backend Phase 5
├── 5.1: Refund endpoint
│   └── Depends on: Contract refund_bounty method (✅ DONE)
├── 5.2: Revoke endpoint
│   └── Depends on: Contract revoke_bounty method (✅ DONE)
└── 5.3: Frontend refund UI
    └── Depends on: 5.1
```

## Resolution Priority

1. **Fix self-review overhead** - Manager takes over verification
2. **Complete Frontend 4.2** - useUnifiedWallet signing
3. **Verify Backend endpoints** - wallet linking, claim, refund all exist
4. **Unblock Frontend 4.3 → 4.6** - sequential dependency chain
5. **Start Backend Phase 5** - parallel with Frontend 4.x
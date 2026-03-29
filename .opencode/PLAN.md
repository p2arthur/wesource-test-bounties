# Manager Plan — WeSource Orchestration

**Last Updated:** 2026-03-29 02:09 PDT  
**Objective:** Eliminate worker self-management overhead, accelerate Phase 4 completion

---

## Current Situation

Frontend agent stuck on Task 4.2 (useUnifiedWallet signing) due to:
- Excessive self-review cycles (spec reviewer → implementer → code reviewer → repeat)
- High token burn (~95k tokens, 58% Claude Code usage)
- Slow progress (Task 4.2 taking >30 minutes)

**Goal:** Restart Phase 4 with manager-worker flow, finish by morning.

---

## Phase 1: Manager-Worker Implementation (Immediate)

### Task M1: Verify Backend Endpoints Exist
- Check `POST /api/bounties/link-wallet` (wallet linking)
- Check `POST /api/bounties/claim` (claim endpoint)
- Confirm both return proper auth requirements
- **Status:** ⏳ pending

### Task M2: Assign Frontend Task 4.2
- Spawn frontend worker with clean task:
  ```
  Task: Add signLoginMessage method to useUnifiedWallet hook
  Scope: Only implementation, no self-review
  Model: deepseek-v3.2 (cheap, fast)
  Timeout: 15 minutes
  ```
- Monitor progress, interrupt if stuck
- **Status:** ⏳ pending

### Task M3: Run Verification Gate
After frontend worker commits Task 4.2:
1. Spawn spec reviewer subagent → check against auth spec
2. Run `npm test` in `/client`
3. If passes → mark Task 4.2 done
4. If fails → provide specific fixes, reassign
- **Status:** ⏳ pending

### Task M4: Unblock Task Chain
Once Task 4.2 verified:
1. Assign Task 4.3 (API auth headers)
2. Assign Task 4.4 (useX402Fetch hook)
3. Assign Task 4.5 (useAuth hook)
4. Assign Task 4.6 (claim button logic)
5. Assign Task 4.7 (microAlgos conversion)
- **Status:** ⏳ pending

### Task M5: Parallel Backend Phase 5
While frontend works on Phase 4:
1. Assign Backend Task 5.1 (refund endpoint)
2. Assign Backend Task 5.2 (revoke endpoint)
3. Verify both endpoints work
4. Unblock Frontend Task 5.3 (refund UI)
- **Status:** ⏳ pending

---

## Phase 2: Pipeline Optimization (After Phase 4 Complete)

### Task M6: Refine Verification Gates
- Create standardized spec templates for each worker
- Automate test runs after each commit
- Add integration test checks
- **Status:** ⏳ future

### Task M7: Resource Monitoring Dashboard
- Real-time token usage tracking
- Model availability alerts
- Budget forecasting
- **Status:** ⏳ future

### Task M8: Automated Dependency Resolution
- Parse `BLOCKERS.md` for dependency chains
- Auto-assign tasks when dependencies clear
- Predictive ETA based on historical pace
- **Status:** ⏳ future

---

## Success Metrics

**Phase 4 Completion:** All 7 frontend tasks done, verified, integrated
**Time Saved:** 
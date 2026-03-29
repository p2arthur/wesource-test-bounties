# Worker Task Assignments

**Format:** [YYYY-MM-DD HH:MM] Worker: Task description  
**Status:** waiting | assigned | in-progress | verifying | done | blocked  
**Dependencies:** What must be done first  
**Verification:** spec | code-quality | integration-test  

---

## Phase 4: Claim Flow UI (Frontend)

### [2026-03-29 02:06] Frontend Task 4.1: Fix claim button logic

**Worker:** frontend  
**Task:** Update BountyPage.tsx to show claim button only for READY_FOR_CLAIM + isWinner  
**Dependencies:** Backend wallet linking endpoint (POST /api/bounties/link-wallet)  
**Status:** done  
**Assigned:** 2026-03-29 01:30  
**Completed:** 2026-03-29 01:45  
**Verification:** spec-compliance ✅ | code-quality ✅

### [2026-03-29 02:06] Frontend Task 4.2: Update useUnifiedWallet with signing

**Worker:** frontend  
**Task:** Add signLoginMessage method to useUnifiedWallet hook for traditional wallet auth  
**Dependencies:** Backend auth endpoints (POST /api/bounties/claim with Wallet header)  
**Status:** in-progress  
**Assigned:** 2026-03-29 01:45  
**Completed:**  
**Verification:** spec-compliance ⏳ | code-quality ⏳  
**Notes:** Stuck in self-review loops. Manager will handle verification.

### [2026-03-29 02:06] Frontend Task 4.3: Update API Service with auth headers

**Worker:** frontend  
**Task:** Update api.ts and entities.ts to send Authorization: Wallet ${address}:${signature}:${message} or Bearer ${jwt} based on walletType  
**Dependencies:** Task 4.2 (useUnifiedWallet signing)  
**Status:** waiting  
**Assigned:**  
**Completed:**  
**Verification:**  

### [2026-03-29 02:06] Frontend Task 4.4: Update useX402Fetch Hook

**Worker:** frontend  
**Task:** Modify useX402Fetch to accept auth headers from useAuth hook  
**Dependencies:** Task 4.3 (API service auth headers)  
**Status:** waiting  
**Assigned:**  
**Completed:**  
**Verification:**  

### [2026-03-29 02:06] Frontend Task 4.5: Create useAuth Hook

**Worker:** frontend  
**Task:** Create useAuth hook that provides auth headers and error handling  
**Dependencies:** Task 4.2 (signing), Task 4.3 (API headers)  
**Status:** waiting  
**Assigned:**  
**Completed:**  
**Verification:**  

### [2026-03-29 02:06] Frontend Task 4.6: Update BountyPage Claim Logic

**Worker:** frontend  
**Task:** Update claim button to call backend claim endpoint, then on-chain contract  
**Dependencies:** Backend claim endpoint (POST /api/bounties/claim), contract claim function  
**Status:** waiting  
**Assigned:**  
**Completed:**  
**Verification:**  

### [2026-03-29 02:06] Frontend Task 4.7: Update Other Components with MicroAlgos Conversion

**Worker:** frontend  
**Task:** Update CreateBountyModal, WonBountiesSidebar to display ALGO (divide microAlgos by 1,000,000)  
**Dependencies:** Backend returning microAlgos in API responses  
**Status:** waiting  
**Assigned:**  
**Completed:**  
**Verification:**  

## Phase 5: Refund Flow UI (Backend + Frontend)

### [2026-03-29 02:06] Backend Task 5.1: Refund endpoint

**Worker:** backend  
**Task:** Implement POST /api/bounties/{id}/refund for bounty creator to reclaim funds  
**Dependencies:** Contract refund_bounty method, auth guard  
**Status:** waiting  
**Assigned:**  
**Completed:**  
**Verification:**  

### [2026-03-29 02:06] Backend Task 5.2: Revoke endpoint

**Worker:** backend  
**Task:** Implement POST /api/bounties/{id}/revoke for manager to reclaim expired bounties  
**Dependencies:** Contract revoke_bounty method, manager-only guard  
**Status:** waiting  
**Assigned:**  
**Completed:**  
**Verification:**  

### [2026-03-29 02:06] Frontend Task 5.3: Refund UI

**Worker:** frontend  
**Task:** Add refund button to BountyPage for REFUNDABLE status + isCreator  
**Dependencies:** Backend Task 5.1 (refund endpoint)  
**Status:** waiting  
**Assigned:**  
**Completed:**  
**Verification:**  

---

## Phase Completion Status

- **Phase 1 (Contract):** ✅ Done  
- **Phase 2 (Types):** ✅ Done  
- **Phase 3 (Auth):** ✅ Done  
- **Phase 4 (Claim):** 🟡 In Progress (Frontend Task 4.2)  
- **Phase 5 (Refund):** ⏳ Waiting  
- **Phase 6 (Profiles):** ⏳ Waiting  
- **Phase 7 (Polish):** ⏳ Waiting
# Step 2: Core Flow Audit — End-to-End Trace

**Prerequisite**: Complete Step 1. `MEMORY.md` must contain the full inventory.
**Output**: Findings logged in `MEMORY.md` under `## Findings (Raw)`.
**Mindset**: You are a detective. Follow every code path. Trust nothing.

---

## How to Audit a Flow

For each of the five flows below, follow this method:

1. **Identify the entry point** — the user action or system event that starts the flow.
2. **Walk the code path** across layers — read every function in the chain.
3. **At each boundary crossing** (frontend→backend, backend→contract, backend→GitHub),
   check:
   - Are the **types** identical or safely converted?
   - Is the **error case** handled? What happens if this call fails?
   - Is there **authorization**? Can an unauthorized actor trigger this?
4. **Fill the checklist** — answer every question. If unsure, note it as an open question.
5. **Log findings immediately** in `MEMORY.md` with:
   - Severity: `CRITICAL` | `HIGH` | `MEDIUM` | `LOW` | `INFO`
   - File paths involved
   - What you observed vs what you expected

---

## Flow 1 — Project & Repository Registration

### What Should Happen
A user creates a project and links it to a GitHub repository. The system
stores enough information to later fetch issues and validate solver
contributions.

### Trace Guidance
- Start from the frontend form/page where a user creates a project.
- Follow the API call to the backend controller → service.
- Determine what is persisted (DB? on-chain? both?).
- Check if the GitHub repo is validated (does it exist? does the user have access?).
- Check if there's an on-chain registration step or if projects are purely off-chain.

### Audit Questions
- What is the unique identifier for a project? Is it consistent across layers?
- If project creation involves both a DB write and a contract call, are they
  coordinated? What happens if one succeeds and the other fails?
- Can a user register the same repo twice? Should they be able to?
- Is there input validation on the repo URL/owner/name?
- Who owns a project? How is ownership established and checked later?

---

## Flow 2 — GitHub Issue Ingestion

### What Should Happen
The system reads open issues from a linked GitHub repository. These issues
are displayed to users as candidates for bounty creation.

### Trace Guidance
- Find where GitHub issues are fetched (service, cron, webhook handler).
- Follow the data from GitHub API response → internal model → API response → frontend display.
- Check the GitHub authentication (token, OAuth app, GitHub App).

### Audit Questions
- How fresh is the issue data? Is it cached? What's the staleness window?
- Are issues filtered? (e.g., only open issues, only unassigned, only with certain labels?)
- What issue fields are stored/used? (number, title, body, state, assignees, labels, linked PRs)
- Does the system handle GitHub API errors gracefully? (404 repo, 403 rate limit, 401 bad token)
- What happens to an active bounty if the underlying issue is closed, deleted, or transferred?
- Is pagination handled for repos with 100+ issues?

---

## Flow 3 — Bounty Creation ⚠️ HIGH PRIORITY

### What Should Happen
A user selects an issue, specifies a bounty amount, and funds an on-chain
escrow. The bounty is recorded both on-chain and off-chain.

### Trace Guidance
- Start from the frontend bounty creation UI.
- Trace the amount value from input field → transaction argument → contract method parameter → storage.
- Identify: is the bounty created and funded atomically, or in separate steps?
- Check what the backend does when notified of a new bounty (or does it watch the chain?).

### Audit Questions — The Money Trail 💰
- **Unit discipline**: Where does the Algo→microAlgo conversion happen? Is it
  done exactly once? Use the contract's storage type as the reference.
- **Atomic safety**: Can a bounty record exist on-chain without funds? Can funds
  be sent without creating the bounty record?
- **Amount boundaries**: Is there a minimum/maximum? Where is it enforced?
  (Frontend only? Backend? Contract? All three?)
- **ABI alignment**: Do the types passed by the frontend transaction composer
  exactly match the contract's ABI method signature? Check every parameter.
  Use `implement-arc-standards` (especially `arc4-abi.md`) as reference.
- **Escrow model**: Who holds the funds — the application account? A separate
  escrow? How are the funds identified per-bounty?
- **Duplicate protection**: Can two bounties exist for the same issue?
- **Failure reconciliation**: If the on-chain transaction succeeds but the
  backend write fails, how does the system recover? Is there an indexer
  sync or reconciliation job?

### Contract-Specific Checks
Use `algorand-typescript` → `references/transactions.md` to verify:
- Inner transaction construction
- Minimum balance requirement handling
- Opcode budget considerations

Use `call-smart-contracts` → `references/REFERENCE.md` to verify:
- Transaction composer usage on the calling side
- Correct method selector resolution

---

## Flow 4 — Oracle & Solver Verification ⚠️ HIGH PRIORITY

### What Should Happen
When a GitHub issue is resolved (PR merged, issue closed), the oracle verifies
who solved it and authorizes the release of escrowed funds to the solver's
Algorand address.

### Trace Guidance
- Find the oracle: is it a backend service? a cron job? a webhook listener?
  a standalone process?
- Trace: GitHub event → oracle logic → contract call (`release`/`mark_solved`/equivalent).
- Identify the **GitHub→Algorand identity bridge** — how a GitHub username
  maps to a wallet address.

### Audit Questions — Trust & Verification 🔐
- **Oracle identity**: Who/what is the oracle? What key does it use to sign
  the release transaction? Where is that key stored?
- **Oracle authorization**: Does the contract restrict the release method to
  only the oracle address? Can the oracle address be updated? By whom?
- **Solver identity mapping**: How does the system know *which Algorand address*
  belongs to the GitHub user who solved the issue? Where is this mapping stored?
  Can it be spoofed or manipulated?
- **Verification logic**: What exactly is checked before release?
  - Is the PR author verified?
  - Is the PR merged (not just opened)?
  - Is the issue closed as a result of the PR?
  - Could someone close the issue manually and claim they solved it?
- **Race conditions**: Two PRs for the same issue? Issue reopened after verification?
  Oracle called twice?
- **Timeout / Deadline**: If no one solves the issue, can the creator reclaim?
  Is the deadline enforced on-chain (block round, timestamp)?

### Contract-Specific Checks
Use `troubleshoot-errors` → `references/contract-errors.md` to understand
common failure modes in the oracle→contract call path.

---

## Flow 5 — Fund Withdrawal ⚠️ HIGH PRIORITY

### What Should Happen
After oracle verification, the solver (or the bounty creator on expiry)
withdraws the escrowed funds.

### Trace Guidance
- Is withdrawal **pull-based** (solver initiates a claim transaction) or
  **push-based** (oracle sends funds directly via inner transaction)?
- Trace from frontend withdraw button → transaction → contract method → inner payment.
- Check the contract's state transitions: what changes when a withdrawal happens?

### Audit Questions — Safety & Finality 🛡️
- **Double-claim prevention**: Can the withdraw/claim method be called more
  than once for the same bounty? Is state updated *before* the inner
  transaction pays out?
- **Sender verification**: Does the contract verify that the transaction sender
  is the verified solver (or the creator, in the refund case)?
- **Fee accounting**: Who pays transaction fees? Is there a platform fee?
  Where is it deducted — in the contract or off-chain?
- **Inner transaction structure**: What does the actual payment look like?
  (single Payment txn? grouped with state update?)
- **Refund path**: Can the creator withdraw if the bounty expires? Is this
  a separate method? What happens to the bounty state after refund?
- **Frontend state**: After withdrawal, does the UI update correctly? Is the
  bounty marked as completed/withdrawn?

---

## Cross-Cutting Audit (Apply to ALL Flows)

### Type Consistency

After tracing all five flows, build a **Type Consistency Matrix**. For every
important data field, record its type in each layer and flag mismatches.

Key fields to check:
- Bounty amount
- Project/bounty identifiers
- Algorand addresses
- GitHub issue numbers
- Timestamps or deadlines
- Status enums

### Error Handling at Boundaries

For every boundary crossing you traced, verify:
- Backend→Contract failure: Does the backend catch and translate blockchain errors?
  (Use `troubleshoot-errors` → `references/transaction-errors.md`)
- Frontend→Backend failure: Does the frontend display meaningful errors?
- GitHub API failure: Is there retry logic? Fallback behavior?
- Contract assertion failure: Are error messages descriptive?

### Authorization Chain

For every mutating operation across all flows, trace:
- How does the backend know who the user is?
- Can the backend be called without authentication?
- Does the contract independently verify the caller?
- If both backend and contract check auth, are they checking the *same identity*?

### Smart Contract Safety Sweep

After tracing all flows, do a dedicated pass on the contract(s):
- List every assertion/require/conditional revert. Are any missing?
- Check every Box/storage access — is the existence verified before reading?
- Are there unbounded loops? Can any operation exceed the opcode budget?
- Is the contract upgradeable? Who holds the update key?
- Minimum balance: does the contract account always have enough ALGOs to
  cover its Box storage and minimum balance requirements?

Cite `build-smart-contracts` and `algorand-typescript` → `references/storage.md`
for storage safety patterns.

---

## Step 2 Completion Criteria

You are done with Step 2 when:

- [ ] All 5 flows have been traced with code paths documented
- [ ] Every audit question has been answered (or flagged as unanswerable with a reason)
- [ ] `MEMORY.md` → `## Findings (Raw)` contains all findings with severity, files, and evidence
- [ ] The Type Consistency Matrix is drafted
- [ ] Cross-cutting concerns (errors, auth, contract safety) have been checked

**Now proceed to Step 3.**

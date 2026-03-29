# Step 3: Compile the Audit Report

**Prerequisite**: Complete Steps 1 and 2. `MEMORY.md` should be full.
**Output**: `AUDIT_REPORT.md` — the final deliverable.
**Mindset**: You are a technical writer. Clarity, structure, and actionability.

---

## Report Structure

The `AUDIT_REPORT.md` must contain these five sections, in order.

---

### Section 1: System Inventory (The Map)

Provide a clean, consolidated version of your Step 1 inventory.

**Include:**

- A brief project summary (2–3 sentences — what it does, who it's for).
- A **Mermaid architecture diagram** showing the monorepo structure:
  modules, services, contracts, and external dependencies (GitHub API,
  Algorand node, database).
- A table of all **smart contract methods** with their signatures.
- A table of all **backend API routes** with their HTTP method, path,
  auth requirement, and purpose.
- A table of all **frontend pages/views** with their route and key functionality.

Use `architecture-mermaid-visualizer` to produce publication-quality diagrams.

---

### Section 2: Findings Ledger (The Evidence)

This is the core of the report. Convert every raw finding from `MEMORY.md`
into a structured entry.

**Format for each finding:**

```text
### [SEVERITY] F-{number}: {Title}

**Flow**: {1–5 | Cross-cutting}
**Risk**: {What could go wrong in production}
**Files**:
- `path/to/file1.ts` (lines X–Y)
- `path/to/file2.ts` (lines X–Y)

**Observation**:
{What you found. Be specific. Include code snippets.}

**Expected Behavior**:
{What the code should do, referencing the contract as source of truth.}

**Recommendation**:
{Concrete fix. Cite the relevant skill/rule if applicable.}

**Severity Guide:**

| Severity | Meaning | Example |
|----------|---------|---------|
| 🔴 CRITICAL | Funds at risk or security bypass | Double-claim, missing auth on withdrawal |
| 🟠 HIGH | Core flow broken or unreliable | Type mismatch causing failed transactions |
| 🟡 MEDIUM | Degraded experience or minor risk | Missing error handling, no input validation |
| 🟢 LOW | Code quality or maintainability | NestJS anti-patterns, missing DTOs |
| 🔵 INFO | Observation or suggestion | Performance optimization, future consideration |

**Ordering:**

1. CRITICAL findings first, then HIGH, MEDIUM, LOW, INFO.
2. Within the same severity, order by flow number (1→5), then cross-cutting.

### Section 3: Type Consistency Matrix

Present the full matrix you built in Step 2. This is a standalone reference
table that any developer can use to spot mismatches at a glance.

**Format:**

| Data Field | Contract (Source of Truth) | Backend DTO/Entity | Frontend | Status |
|------------|---------------------------|-------------------|----------|--------|
| Bounty Amount | uint64 (microAlgos) | ? | ? | ✅ or ❌ + note |
| ... | ... | ... | ... | ... |

Mark every row with:

- ✅ Aligned — types match or conversion is explicit and correct
- ⚠️ Implicit conversion — works but fragile (e.g., JSON number for uint64)
- ❌ Mismatch — types conflict or conversion is missing

### Section 4: Priority Roadmap

Convert findings into an actionable work plan. Group by priority tier.

**Format:**

| Priority | ID | Title | Effort | Impact | Flow |
|----------|-----|-------|--------|--------|------|
| 🔴 P0 — Do Now | F-1 | Fix double-claim in contract | S | Critical | 5 |
| 🟠 P1 — This Sprint | F-3 | Add microAlgo converter | S | High | 3 |
| 🟡 P2 — Next Sprint | F-7 | GitHub webhook for real-time sync | M | Medium | 2 |
| 🟢 P3 — Backlog | F-12 | Add NestJS ValidationPipes | S | Low | Cross |

Effort key: S = Small (< 1 day), M = Medium (1–3 days), L = Large (3+ days)

### Section 5: Secondary Observations

Brief notes (1–3 sentences each) on topics that are outside the core five
flows but worth mentioning for future work:

- **x402 Protocol**: Current state of paywalled routes, if any. What's implemented, what's missing. Reference algorand-x402-typescript skill.
- **AI/Agent Accessibility**: Are API responses structured for programmatic consumption? Are there machine-readable status codes and error formats?
- **UI/UX Polish**: Loading states, error states, empty states. Mobile responsiveness. Reference web-design-guidelines and react-best-practices.
- **Testing & CI/CD**: Test coverage, deployment pipelines, environment management. Reference nestjs-best-practices → test-\* rules.
- **Observability**: Logging, monitoring, health checks. Reference nestjs-best-practices → devops-\* and micro-\* rules.

### Report Quality Checklist

Before finalizing AUDIT_REPORT.md, verify:

- [ ] Every finding cites specific file paths and code evidence
- [ ] No finding is just an opinion — each has an observation and expected behavior
- [ ] The Type Consistency Matrix covers at least: amount, IDs, addresses, issue numbers, deadlines, status
- [ ] The priority roadmap is sorted and has effort/impact estimates
- [ ] Mermaid diagrams render correctly (test the syntax)
- [ ] Section 5 acknowledges secondary topics without going deep
- [ ] The report could be handed to a developer who has never seen the codebase and they would understand what to fix and in what order

### Final Step

After producing AUDIT_REPORT.md, update MEMORY.md one last time:

- Move all raw findings into an `## Archived` section (they're now in the report).
- Keep `## Architectural Facts` — these remain useful for future audits.
- Add a `## Report Meta` section noting: date, files read count, findings count by severity, and any areas you could not fully audit (with reasons).
```

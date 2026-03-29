---

## File 2: `STEP_1_INVENTORY.md`

```markdown
# Step 1: Codebase Inventory & Architectural Hypothesis

**Prerequisite**: Read `agents.md` first.
**Output**: Updated `MEMORY.md` + initial Mermaid architecture diagram.
**Mindset**: You are a cartographer. Map everything. Judge nothing yet.

---

## 1.1 — Read the Project Documentation

Read every file in `./docs/`. Your goal is to answer:

- What is this project trying to accomplish?
- Who are the actors? (project owners, bounty creators, solvers, oracles, admins)
- What is the intended happy path for the bounty lifecycle?
- What blockchain primitives are used? (app calls, payments, inner transactions, boxes)
- Are there any stated design decisions or constraints?

Write a **2–3 paragraph summary** of your understanding in `MEMORY.md`
under `## Architectural Facts`.

---

## 1.2 — Inventory the Smart Contract Layer

Navigate to `/contracts` and read every contract source file.

For each contract, document:

| Item | What to Record |
|------|---------------|
| **Contract name** | As declared in the source |
| **ABI methods** | Every public/external method — name, parameters (name + type), return type |
| **Storage schema** | Every Global, Local, Box, and BoxMap — key name, key type, value type, purpose |
| **Inner transactions** | Any payment, asset transfer, or app call the contract sends |
| **Access controls** | Who can call what? (creator only? any account? a specific oracle address?) |
| **Events / Logs** | Any ARC-28 events or log emissions |

Use the `algorand-typescript` skill (especially `references/storage.md`,
`references/methods-and-abi.md`, `references/types-and-values.md`) to correctly
interpret the contract source.

Use the `build-smart-contracts` skill to check whether the contract follows
ARC-32/56 conventions.

Record everything in `MEMORY.md`.

---

## 1.3 — Inventory the Backend Layer

Navigate to `/backend` and map the NestJS application structure.

For each module, document:

| Item | What to Record |
|------|---------------|
| **Module name** | The NestJS `@Module` class |
| **Controllers** | Every route — HTTP method, path, params, body DTO, return type |
| **Services** | Every public method — what it does, what it calls |
| **Guards / Interceptors** | What protects which routes |
| **External integrations** | GitHub API calls, Algorand node/indexer calls, DB queries |
| **DTOs / Entities** | Data shapes at the API boundary and persistence layer |
| **Config** | Environment variables, feature flags, chain IDs, app IDs |

Use the `nestjs-best-practices` skill to understand expected patterns.
Don't audit for compliance yet — just map what exists.

Pay special attention to:
- **Which service talks to the blockchain?** (transaction composer, algod client)
- **Which service talks to GitHub?** (REST API, webhooks, OAuth)
- **Where is the oracle logic?** (dedicated service? cron job? event listener?)

Record everything in `MEMORY.md`.

---

## 1.4 — Inventory the Frontend Layer

Navigate to `/frontend` and map the application structure.

For each page/feature, document:

| Item | What to Record |
|------|---------------|
| **Routes / Pages** | Every navigable page and its URL pattern |
| **API calls** | Every `fetch`/`axios`/hook that calls the backend — endpoint + method |
| **On-chain transactions** | Every place the frontend builds and signs a transaction |
| **State management** | What global/shared state exists (context, stores, URL state) |
| **Wallet integration** | How the user connects their Algorand wallet, how the address flows through the app |
| **Key components** | Forms, lists, status displays related to projects, issues, and bounties |

Use `react-best-practices` and `composition-patterns` for pattern recognition.
Don't audit yet — just map.

Record everything in `MEMORY.md`.

---

## 1.5 — Produce the Architectural Hypothesis

Using everything you've recorded, produce:

### A. Module Dependency Diagram

A Mermaid diagram showing how the backend modules relate to each other,
to the contract, and to external services (GitHub, Algorand node).

Use the `architecture-mermaid-visualizer` skill.

### B. Data Flow Overview

A Mermaid sequence diagram showing your *current understanding* of the
bounty lifecycle — from project registration through fund withdrawal.
This is a hypothesis. You will refine it in Step 2.

### C. Open Questions List

In `MEMORY.md` under `## Open Questions`, list everything that is unclear:

- Modules you found but don't understand their role
- Contract methods with ambiguous names
- Missing connections (e.g., "the backend has a BountyService but I see no
  controller route that calls it")
- Data fields that appear in one layer but not another

---

## 1.6 — Completion Criteria

You are done with Step 1 when:

- [ ] `MEMORY.md` contains a project summary from docs
- [ ] Every contract method and storage key is listed
- [ ] Every backend module, controller route, and service method is listed
- [ ] Every frontend page, API call, and transaction builder is listed
- [ ] You have produced at least one Mermaid architecture diagram
- [ ] You have produced an initial lifecycle sequence diagram
- [ ] Open questions are documented

**Now proceed to Step 2.**

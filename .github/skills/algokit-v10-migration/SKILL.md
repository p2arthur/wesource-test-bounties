---
name: migrate-algokit-utils-v10
description: Guides the migration of TypeScript projects from AlgoKit Utils v9 to v10. Use when upgrading dependencies, refactoring legacy function-based code to the new fluent AlgorandClient API, or resolving deprecation warnings related to v10 architectural changes. Triggers include "upgrade algokit-utils", "migrate from v9 to v10", "use AlgorandClient", "replace getAlgoClient", "refactor to fluent API".
---

# AlgoKit Utils v10 Migration

Migrate from legacy function-based utilities to the new modular, fluent AlgorandClient architecture.

## Overview / Core Workflow

1. Update project dependencies and `tsconfig.json` for new subpath exports
2. Replace legacy entry points (for example, `getAlgoClient`) with AlgorandClient static initializers
3. Refactor standalone functions (for example, `transferAlgos`) to use the fluent `algorand.send.*` API
4. Update account management to use AccountManager and typed Address objects
5. Transition smart contract logic from AppClient to the new AppFactory and AppClient split
6. Fix tests and fixtures for v10 APIs

## How to proceed

1. **Update dependencies and config:**
   - Install the latest version: `npm install @algorandfoundation/algokit-utils@latest`
   - Note: `algosdk` is no longer a required direct dependency for most high-level tasks
   - Update `moduleResolution` in `tsconfig.json` to `Node16`, `NodeNext`, or `Bundler` to support subpath exports

2. **Initialize AlgorandClient:** Replace legacy `getAlgoClient()` calls with the appropriate AlgorandClient method:

| v9 Legacy                      | v10 AlgorandClient                 |
| ------------------------------ | ---------------------------------- |
| `getAlgoClient()`              | `AlgorandClient.defaultLocalNet()` |
| `getAlgoClient(testnetConfig)` | `AlgorandClient.testNet()`         |
| `getAlgoClient(mainnetConfig)` | `AlgorandClient.mainNet()`         |
| Environment-based              | `AlgorandClient.fromEnvironment()` |

3. **Refactor common transactions:** Convert standalone functions into fluent calls via the client:

**Payment:**

```ts
// v10 - Payment
await algorand.send.payment({ sender, receiver, amount: (5).algos() });
```

**Asset Transfer:**

```ts
// v10 - Asset Transfer
await algorand.send.assetTransfer({ sender, receiver, assetId: 123n, amount: 10n });
```

4. **Update naming and types:**
   - IDs: Change `assetID`/`appID` (number) to `assetId`/`appId` (bigint)
   - Addressing: Use Address objects from `/common` instead of raw strings where typed addresses are required
   - Enums: Replace string-based `OnComplete` values with the `OnApplicationComplete` enum

5. **Update app client logic:**
   - Use AppFactory to create and deploy apps
   - Use AppClient for interactions with existing apps
   - `appClient.call()` ➡️ `appClient.send.call()`

6. **Fix test fixtures:**
   - Update `algorandFixture()` usage: `beforeEach(fixture.beforeEach)` ➡️ `beforeEach(fixture.newScope)`

## Important Rules / Guidelines

- **Use subpath exports** — Import from `@algorandfoundation/algokit-utils/transact`, `/common`, etc., instead of `/types/*`
- **Prefer bigints** — Always use the `n` suffix for asset and application IDs (for example, `123n`) to match v10's strict type system
- **Fluent API over Standalone** — Do not use deprecated v9 functions; always use the algorand client instance for chainable methods
- **No more `.do()`** — v10 client methods return promises directly; remove all legacy `.do()` suffixes from SDK-wrapped calls

## Common Variations / Edge Cases

| Scenario                | Approach                                                           |
| ----------------------- | ------------------------------------------------------------------ |
| Manual Client Creation  | `AlgorandClient.fromClients({ algod, indexer, kmd })`              |
| Custom Config           | `AlgorandClient.fromConfig({ algodConfig, ... })`                  |
| Transaction Composition | `algorand.newGroup()` for atomic grouping                          |
| Debugging/Simulation    | Replace `atc.simulate()` with `composer.simulate()`                |
| ARC-32 to ARC-56        | v10 supports ARC-56 natively; use `arc32ToArc56` utility if needed |

References / Further Reading
[Algokit v10 migration guide:](https://github.com/lempira/algokit-utils-ts/blob/docs/migration-guide-v9-v10/MIGRATION_GUIDE_v9_to_v10.md)

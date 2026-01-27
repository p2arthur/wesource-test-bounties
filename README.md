# Capstone Milestone 1: Project Proposal

## Project Title

**WeSource** _Empowering Open Source Sustainability through Decentralized Bounties._

---

## Problem Statement

Open-source software powers the modern world, yet many projects suffer from "maintainer burnout" and a lack of consistent contributions. Critical bugs or feature requests often languish because there is no direct mechanism to incentivize developers for specific, one-off tasks. **WeSource** bridges this gap by allowing supporters to place direct financial value on specific GitHub issues, ensuring that impactful work is prioritized and rewarded fairly via a secure, transparent escrow system.

---

## Overview of the Application’s Functionality

WeSource is a decentralized bounty platform designed to foster collaboration between project creators, supporters, and contributors. Project owners register their repositories on the platform, which syncs with GitHub to track open issues. Supporters can browse these issues and "stake" funds (**ALGO** or **USDC**) into a secure smart contract to create or "stack" onto an existing bounty.

The platform employs a **Claim-Based Reward Model**. A backend oracle service, powered by the **GitHub GraphQL API**, monitors Pull Requests for merge events. Once a merge is detected and the contributor's identity is verified, the backend updates the smart contract to authorize a withdrawal. The contributor then logs into WeSource via their **Web3Auth**-derived wallet and manually "claims" their prize. This ensures a secure, verifiable cycle of contribution where developers are guaranteed payment for resolved work.

---

## Technology Stack

- **Frontend:** React.js (Marketplace UI and Contributor Claim Portal)
- **Backend:** Nest.js (REST API, Oracle logic, and GraphQL integration)
- **Database:** SQLite (Development) / PostgreSQL (Production)
- **External API:** GitHub GraphQL API (For tracking PR merges and issue references)
- **Blockchain:** Algorand (Smart Contracts for Escrow)
- **Smart Contract Tooling:** AlgoKit with Algorand TypeScript (Puya)
- **Authentication/Wallet:** Web3Auth (GitHub Social Login & non-custodial wallet)
- **Automation:** Cron Jobs (For scheduled polling of GitHub status)

---

## Software Development Life Cycle (SDLC)

To ensure a structured and iterative development process, the project will follow an **Agile Methodology**:

- **Sprint-Based Development:** Development will be broken into 1-2 week sprints, each focusing on a specific core feature (e.g., Authentication Sprint, Smart Contract Sprint, Oracle Sprint).
- **Version Control:** Git and GitHub will be used for all source code management.
- **Branching Strategy:** A **Feature Branching** workflow will be utilized. All new work will be developed on dedicated `feature/` branches and merged into the `main` branch only after successful testing.
- **Continuous Iteration:** Each sprint will conclude with a self-review of the feature's functionality, ensuring the MVP remains stable throughout the course.

---

## Features to be Implemented

### Core Features (Essential for Launch)

- **GitHub/Web3Auth Integration:** OAuth-based login that generates a unique Algorand address for every developer.
- **Bounty Creation & Stacking:** Allow users to deposit ALGO or USDC into an escrow contract tied to a GitHub issue.
- **GraphQL Status Oracle:** A Nest.js service that queries GitHub to verify if an issue was closed by a specific PR merge.
- **Bounty Marketplace:** A searchable dashboard for contributors to find "Open" and "Claimable" bounties.
- **The Claim Portal:** A UI where verified winners can trigger the withdrawal of funds from the escrow contract.
- **Secure Escrow Contract:** A stateful smart contract that locks funds and only permits withdrawal to the address authorized by the oracle.

### Additional Features (Future Plans)

- **Multi-ASA Support:** Support for any Algorand Standard Asset.
- **Dispute Mechanism:** A system for maintainers to flag fraudulent claims.
- **On-Chain CV:** Public profiles showing a developer's earned bounties and resolved issues.

---

## User Stories

1. **As a Project Creator**, I want to link my repository to WeSource so that my community can see exactly which bugs have financial incentives attached.
2. **As a Supporter**, I want to contribute USDC to an existing bounty so that the total prize is high enough to attract a skilled developer.
3. **As a Technical Contributor**, I want the platform to use GraphQL to verify my work so that there is no ambiguity about whether my PR solved the specific bountied issue.
4. **As a Bounty Winner**, I want to see a "Claim" button on my dashboard after my PR is merged so that I can securely withdraw my reward.
5. **As a Developer**, I want to sign in with my GitHub account so that I don't have to manage a separate crypto wallet to participate.

---

## Instructor Feedback and Approval

_Space reserved for instructor comments and signature._

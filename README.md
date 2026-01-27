# Capstone Milestone 1: Project Proposal

## Project Title

**WeSource** _Empowering Open Source Sustainability through Decentralized Bounties._

---

## Problem Statement

Open-source software powers the modern world, yet many projects suffer from "maintainer burnout" and a lack of consistent contributions. Critical bugs or feature requests often languish because there is no direct mechanism to incentivize developers for specific, one-off tasks. Current sponsorship models are often "all-or-nothing" and do not reward specific output. **WeSource** bridges this gap by allowing supporters to place direct financial value on specific GitHub issues, ensuring that impactful work is prioritized and rewarded fairly via a secure, transparent escrow system.

---

## Overview of the Application’s Functionality

WeSource is a decentralized bounty platform designed to foster collaboration between project creators, supporters, and contributors. Project owners register their repositories on the platform, which syncs with GitHub to track open issues. Supporters can browse these issues and "stake" funds (**ALGO** or **USDC**) into a secure smart contract to create or "stack" onto an existing bounty.

The platform utilizes a backend oracle system powered by the **GitHub GraphQL API** to monitor Pull Request (PR) statuses with high precision. Once a PR is merged by the project owner, the system verifies the contributor's identity via their GitHub-linked account. Instead of an automated push payment, WeSource employs a **Claim-Based Model**: the backend authorizes the specific contributor on-chain, and the contributor then logs in via **Web3Auth** to manually claim their prize. This ensures a secure, verifiable, and trustless cycle of contribution where the developer who solves the issue is guaranteed their reward.

---

## Technology Stack

- **Frontend:** React.js (Client-side UI, Marketplace, and Claim Portal)
- **Backend:** Nest.js (REST API, Oracle logic, and GitHub integration)
- **Database:** SQLite (Development) / PostgreSQL (Production)
- **External API:** GitHub GraphQL API (For tracking PR merges and issue references)
- **Blockchain:** Algorand (Smart Contracts for Escrow and Reward distribution)
- **Smart Contract Tooling:** AlgoKit with Algorand TypeScript (Puya)
- **Authentication/Wallet:** Web3Auth (GitHub OAuth login and non-custodial wallet derivation)
- **Automation:** Cron Jobs (For scheduled polling of GitHub status)

---

## Features to be Implemented

### Core Features (Essential for Launch)

- **GitHub/Web3Auth Integration:** Users log in via GitHub to automatically derive a unique Algorand wallet address.
- **Bounty Creation & Stacking:** Supporters can deposit ALGO or USDC into a smart contract tied to a specific GitHub issue. Multiple supporters can add to the same pool.
- **GraphQL Status Oracle:** A backend service that verifies when a PR is merged and identifies the correct contributor.
- **Bounty Marketplace:** A searchable dashboard for developers to discover issues with active financial backing.
- **The Claim Portal:** A dedicated UI for verified contributors to trigger the withdrawal of their earned bounties.
- **Secure Escrow Contract:** A stateful smart contract that locks funds and only permits withdrawal to the address authorized by the oracle.

### Additional Features (Future Plans)

- **Multi-ASA Support:** Expanding support to any Algorand Standard Asset.
- **Dispute Mechanism:** A system for maintainers to flag fraudulent claims or request reviews.
- **On-Chain CV:** Public profiles showcasing a developer's earned bounties and successful contributions.

---

## User Stories

1.  **As a Project Creator**, I want to link my GitHub repository to WeSource so that I can see which issues my community values most through their financial backing.
2.  **As a Supporter**, I want to add USDC to an existing bounty so that I can increase the incentive for a developer to fix a critical bug.
3.  **As a Technical Contributor**, I want the platform to use GraphQL to verify my work so that the payout process is linked directly to my merged code.
4.  **As a Bounty Winner**, I want to see a "Claim" button on my dashboard after my PR is merged so that I can securely withdraw my reward to my wallet.
5.  **As a Developer**, I want to sign in with my GitHub account so that I can participate in the ecosystem without managing complex private keys or separate wallets.

---

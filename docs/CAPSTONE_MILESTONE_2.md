# WeSource - Capstone Project Milestone 2

**Project:** WeSource - Decentralized Open Source Bounty Platform  
**Student:** Arthur Rabelo  
**Date:** February 2026  
**Repository:** [github.com/p2arthur/WeSource_monorepo](https://github.com/p2arthur/WeSource_monorepo)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Frontend-Backend Interaction](#3-frontend-backend-interaction)
4. [Database Schema Design](#4-database-schema-design)
5. [CRUD Operations](#5-crud-operations)
6. [API Contract](#6-api-contract)
7. [Smart Contract Interface](#7-smart-contract-interface)
8. [Authorization & Security](#8-authorization--security)
9. [Deployment Architecture](#9-deployment-architecture)
10. [Appendix: Mermaid Diagrams](#appendix-mermaid-diagrams)

---

## 1. Executive Summary

WeSource is a decentralized bounty platform that connects open-source project maintainers with contributors through cryptocurrency-backed rewards on the Algorand blockchain. The platform enables:

- **Project Owners** to create bounties for GitHub issues
- **Contributors** to discover and work on bounties
- **Automated Verification** of completed work via GitHub API
- **Secure Escrow** of funds using Algorand smart contracts

### Key Features

| Feature              | Description                                                                  |
| -------------------- | ---------------------------------------------------------------------------- |
| Bounty Creation      | Fund GitHub issues with USDC (or other cryptocurrencies in the future)       |
| Escrow System        | Smart contract holds funds until work is verified (claimable by contributor) |
| GitHub Integration   | Automatic detection of merged PRs                                            |
| Multi-Wallet Support | Web3Auth for GitHub login + Algorand wallets (Pera, Defly)                   |
| Transparent Payments | All transactions recorded on-chain                                           |

---

## 2. High-Level Architecture

### 2.1 System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           WeSource Platform                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌────────────┐      ┌────────────┐      ┌────────────────────────┐    │
│   │   React    │      │   NestJS   │      │   Algorand Blockchain  │    │
│   │  Frontend  │◀────▶│  Backend   │◀────▶│   (Smart Contracts)    │    │
│   └────────────┘      └────────────┘      └────────────────────────┘    │
│         │                   │                        │                   │
│         ▼                   ▼                        ▼                   │
│   ┌────────────┐      ┌────────────┐      ┌────────────────────────┐    │
│   │  Web3Auth  │      │ PostgreSQL │      │    Algorand Indexer    │    │
│   │  Wallets   │      │  Database  │      │  (Transaction History) │    │
│   └────────────┘      └────────────┘      └────────────────────────┘    │
│                             │                                            │
│                             ▼                                            │
│                       ┌────────────┐                                     │
│                       │ GitHub API │                                     │
│                       └────────────┘                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Layer      | Technology                | Purpose                  |
| ---------- | ------------------------- | ------------------------ |
| Frontend   | React + Vite + TypeScript | Single Page Application  |
| Styling    | Tailwind CSS              | UI Framework             |
| Wallet     | use-wallet + Web3Auth     | Multi-wallet support     |
| Backend    | NestJS + TypeScript       | REST API                 |
| Database   | PostgreSQL + Prisma ORM   | Data persistence         |
| Blockchain | Algorand (PuyaTs)         | Smart contracts & escrow |
| External   | GitHub API                | Repository & issue data  |

---

## 3. Frontend-Backend Interaction

### 3.1 Frontend Components

| Component Type | Examples                                     | Purpose                    |
| -------------- | -------------------------------------------- | -------------------------- |
| Pages          | Home, Project, Bounty, Profile               | Main route views           |
| Components     | BountyCard, ProjectCard, Modals              | Reusable UI elements       |
| Contexts       | ProjectContext, VoteContext, Web3AuthContext | Global state               |
| Services       | api.ts, bountyContract.ts                    | Backend & blockchain calls |

### 3.2 Backend Modules

| Module         | Purpose                                       |
| -------------- | --------------------------------------------- |
| ProjectsModule | Project CRUD operations                       |
| BountiesModule | Bounty management & on-chain sync             |
| GithubModule   | GitHub API integration (contributors, issues) |
| AlgorandModule | Blockchain operations (read state, withdraw)  |
| PrismaModule   | Database access layer                         |

### 3.3 Data Flow

1. **User creates bounty** → Frontend calls backend → Backend records in DB → User signs on-chain transaction
2. **User views project** → Backend fetches from DB + live GitHub data → Returns enriched response
3. **Bounty claimed** → Backend verifies PR merged via GitHub → Triggers on-chain withdrawal

---

## 4. Database Schema Design

### 4.1 Entity-Relationship Diagram

```
┌─────────────────────┐          ┌─────────────────────┐
│      PROJECT        │          │     REPOSITORY      │
├─────────────────────┤          ├─────────────────────┤
│ id (PK)             │──────┐   │ id (PK)             │
│ name                │      │   │ githubUrl (UNIQUE)  │
│ description         │      └──▶│ projectId (FK)      │
│ category            │          │ createdAt           │
│ creator             │          │ updatedAt           │
│ createdAt           │          └─────────────────────┘
│ updatedAt           │
└─────────────────────┘

┌─────────────────────┐
│       BOUNTY        │
├─────────────────────┤
│ id (PK)             │
│ bountyKey (UNIQUE)  │◀─── Deterministic hash for on-chain lookup
│ repoOwner           │
│ repoName            │
│ issueNumber         │
│ issueUrl            │
│ amount (microAlgos) │
│ creatorWallet       │
│ status              │◀─── open | claimable | paid
│ winnerId            │
│ createdAt           │
│ updatedAt           │
└─────────────────────┘
```

### 4.2 Data Storage Strategy

| Data                        | Storage              | Reason                        |
| --------------------------- | -------------------- | ----------------------------- |
| Project/Repository metadata | PostgreSQL           | Persistent, queryable         |
| Bounty metadata             | PostgreSQL           | Quick access, status tracking |
| Contributors & Issues       | GitHub API (live)    | Always current                |
| Bounty funds                | Algorand Box Storage | Secure escrow                 |
| Payment records             | Algorand Box Storage | Immutable on-chain            |

---

## 5. CRUD Operations

| Entity     | Create               | Read                             | Update                  | Delete               |
| ---------- | -------------------- | -------------------------------- | ----------------------- | -------------------- |
| Project    | POST /projects       | GET /projects, GET /projects/:id | —                       | DELETE /projects/:id |
| Repository | Created with Project | Included in Project              | —                       | Cascade deleted      |
| Bounty     | POST /bounties       | GET /bounties, GET /bounties/:id | PATCH (internal status) | — (funds locked)     |

---

## 6. API Contract

### 6.1 Endpoints Overview

| Method | Endpoint      | Description                       |
| ------ | ------------- | --------------------------------- |
| POST   | /projects     | Create project with GitHub repos  |
| GET    | /projects     | List all projects                 |
| GET    | /projects/:id | Get project with live GitHub data |
| DELETE | /projects/:id | Delete project (cascade)          |
| POST   | /bounties     | Create bounty for GitHub issue    |
| GET    | /bounties     | List all bounties                 |
| GET    | /bounties/:id | Get bounty with on-chain state    |

### 6.2 Key Request/Response Formats

**Create Project:**

- Request: `{ name, description, category, creator, repoUrls[] }`
- Response: `{ id, name, description, category, creator, repositories[], timestamps }`

**Create Bounty:**

- Request: `{ repoOwner, repoName, issueNumber, amount, creatorWallet }`
- Response: `{ id, bountyKey, issueUrl, amount, status, timestamps }`

**Get Project (with GitHub data):**

- Response: `{ id, name, repositories[{ githubUrl, contributors[], issues[] }] }`

### 6.3 Error Responses

| Code | Meaning            |
| ---- | ------------------ |
| 400  | Invalid input      |
| 404  | Resource not found |
| 429  | GitHub rate limit  |
| 500  | Server error       |

---

## 7. Smart Contract Interface

### 7.1 SourceFactory Contract Methods

| Method          | Parameters              | Description                        |
| --------------- | ----------------------- | ---------------------------------- |
| bootstrap       | —                       | Initialize contract (manager only) |
| create_bounty   | bountyId, bountyValue   | Create escrow for bounty           |
| withdraw_bounty | bountyId, winnerAddress | Release funds (manager only)       |

### 7.2 On-Chain State

| Storage      | Contents                                         |
| ------------ | ------------------------------------------------ |
| Global State | Manager address, total bounties count            |
| Box Storage  | Bounty data (value, paid status, winner address) |

---

## 8. Authorization & Security

| Aspect              | Implementation                  |
| ------------------- | ------------------------------- |
| API Auth            | Public endpoints (MVP)          |
| Wallet Verification | Client provides address         |
| Withdrawal Control  | Backend manager wallet only     |
| On-Chain Validation | Smart contract verifies manager |

---

## 9. Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Production Stack                       │
├─────────────────────────────────────────────────────────┤
│  Vercel (Frontend) ──▶ Railway (Backend + PostgreSQL)   │
│                              │                           │
│                              ▼                           │
│                     Algorand TestNet/MainNet             │
└─────────────────────────────────────────────────────────┘
```

---

## Appendix: Mermaid Diagrams

### A.1 System Architecture

```mermaid
flowchart TB
    subgraph Frontend
        React[React Frontend]
        Web3Auth[Web3Auth / Wallets]
    end

    subgraph Backend
        NestJS[NestJS Backend]
        PostgreSQL[(PostgreSQL Database)]
    end

    subgraph Blockchain
        Algorand[Algorand Smart Contracts]
        Indexer[Algorand Indexer]
    end

    subgraph External
        GitHub[GitHub API]
    end

    React <--> NestJS
    React --> Web3Auth
    NestJS <--> Algorand
    NestJS --> PostgreSQL
    NestJS --> GitHub
    Algorand --> Indexer
```

### A.2 Entity-Relationship Diagram

```mermaid
erDiagram
    PROJECT ||--o{ REPOSITORY : has
    PROJECT {
        int id PK
        string name
        string description
        string category
        string creator
        datetime createdAt
        datetime updatedAt
    }
    REPOSITORY {
        int id PK
        string githubUrl UK
        int projectId FK
        datetime createdAt
        datetime updatedAt
    }
    BOUNTY {
        int id PK
        string bountyKey UK
        string repoOwner
        string repoName
        int issueNumber
        string issueUrl
        int amount
        string creatorWallet
        string status
        int winnerId
        datetime createdAt
        datetime updatedAt
    }
```

### A.3 Bounty Lifecycle Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database
    participant Algorand
    participant GitHub

    Note over User,GitHub: Step 1: Create Bounty
    User->>Frontend: Create bounty for issue
    Frontend->>Backend: POST /bounties
    Backend->>Database: Store bounty metadata
    Frontend->>Algorand: Sign create_bounty tx
    Algorand-->>Frontend: Transaction confirmed

    Note over User,GitHub: Step 2: Discovery
    User->>Frontend: View project
    Frontend->>Backend: GET /projects/:id
    Backend->>Database: Fetch project
    Backend->>GitHub: Fetch contributors & issues
    Backend-->>Frontend: Enriched project data

    Note over User,GitHub: Step 3: Verification & Claim
    Backend->>GitHub: Check if PR merged
    GitHub-->>Backend: PR merged confirmed
    Backend->>Algorand: withdraw_bounty(id, winner)
    Algorand-->>Backend: Funds released
    Backend->>Database: Update status to paid
```

### A.4 Component Architecture

```mermaid
flowchart TB
    subgraph Pages
        Home[Home Page]
        Project[Project Page]
        Bounty[Bounty Page]
        Profile[Profile Page]
    end

    subgraph Contexts
        ProjectCtx[ProjectContext]
        VoteCtx[VoteContext]
        Web3Ctx[Web3AuthContext]
    end

    subgraph Services
        API[api.ts]
        BountyContract[bountyContract.ts]
    end

    subgraph External
        BackendAPI[NestJS Backend]
        AlgorandChain[Algorand]
    end

    Pages --> Contexts
    Contexts --> Services
    API --> BackendAPI
    BountyContract --> AlgorandChain
```

### A.5 Deployment Architecture

```mermaid
flowchart LR
    subgraph Production
        Vercel[Vercel - Frontend]
        Railway[Railway - Backend]
        PostgreSQL[(PostgreSQL)]
        Algorand[Algorand TestNet/MainNet]
    end

    User([User]) --> Vercel
    Vercel --> Railway
    Railway --> PostgreSQL
    Railway --> Algorand
```

### A.6 Data Flow Overview

```mermaid
flowchart LR
    subgraph Client
        UI[React UI]
        Wallet[Wallet]
    end

    subgraph Server
        API[REST API]
        DB[(Database)]
    end

    subgraph Chain
        Contract[Smart Contract]
        Box[Box Storage]
    end

    subgraph GitHub
        GH[GitHub API]
    end

    UI -->|HTTP| API
    Wallet -->|Sign Tx| Contract
    API -->|Query| DB
    API -->|Fetch| GH
    API -->|Read State| Contract
    Contract --> Box
```

---

_Document generated for CCTB Capstone Project - Milestone 2_

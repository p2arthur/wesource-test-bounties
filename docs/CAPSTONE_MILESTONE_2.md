# WeSource - Capstone Project Milestone 2

**Project:** WeSource - Decentralized Open Source Bounty Platform  
**Student:** Arthur Rabelo  
**Date:** February 2026  
**Repository:** [github.com/p2arthur/WeSource_monorepo](https://github.com/p2arthur/WeSource_monorepo)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [High-Level Architecture Diagrams](#2-high-level-architecture-diagrams)
3. [Frontend-Backend Interaction Review](#3-frontend-backend-interaction-review)
4. [Database Requirements](#4-database-requirements)
5. [Database Schema Design](#5-database-schema-design)
6. [Entity-Relationship Diagrams](#6-entity-relationship-diagrams)
7. [CRUD Operations](#7-crud-operations)
8. [API Contract](#8-api-contract)
9. [Authorization & Security](#9-authorization--security)
10. [Technology Stack Summary](#10-technology-stack-summary)

---

## 1. Executive Summary

WeSource is a decentralized bounty platform that connects open-source project maintainers with contributors through cryptocurrency-backed rewards on the Algorand blockchain. The platform enables:

- **Project Owners** to create bounties for GitHub issues
- **Contributors** to discover and work on bounties
- **Automated Verification** of completed work via GitHub API
- **Secure Escrow** of funds using Algorand smart contracts

### Key Features

| Feature | Description |
|---------|-------------|
| Bounty Creation | Fund GitHub issues with ALGO cryptocurrency |
| Escrow System | Smart contract holds funds until work is verified |
| GitHub Integration | Automatic detection of merged PRs |
| Multi-Wallet Support | Pera, Defly, KMD, and Web3Auth social login |
| Transparent Payments | All transactions recorded on-chain |

---

## 2. High-Level Architecture Diagrams

### 2.1 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   WeSource Platform                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────────────┐ │
│  │                  │     │                  │     │                          │ │
│  │   React Client   │────▶│   NestJS Server  │────▶│   Algorand Blockchain    │ │
│  │   (Frontend)     │     │   (Backend API)  │     │   (Smart Contracts)      │ │
│  │                  │◀────│                  │◀────│                          │ │
│  └──────────────────┘     └──────────────────┘     └──────────────────────────┘ │
│          │                        │                          │                   │
│          │                        │                          │                   │
│          ▼                        ▼                          ▼                   │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────────────┐ │
│  │   Web3Auth       │     │   SQLite/Prisma  │     │   Indexer (Algonode)     │ │
│  │   (Social Login) │     │   (Database)     │     │   (Transaction History)  │ │
│  └──────────────────┘     └──────────────────┘     └──────────────────────────┘ │
│                                   │                                              │
│                                   ▼                                              │
│                           ┌──────────────────┐                                   │
│                           │   GitHub API     │                                   │
│                           │   (GraphQL/REST) │                                   │
│                           └──────────────────┘                                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React + Vite)                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │    Home     │  │  Project    │  │   Bounty    │  │   Profile   │             │
│  │    Page     │  │   Page      │  │    Page     │  │    Page     │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                │                     │
│         └────────────────┴────────────────┴────────────────┘                     │
│                                   │                                              │
│                    ┌──────────────┴──────────────┐                               │
│                    │        Context Layer         │                              │
│                    ├─────────────┬────────────────┤                              │
│                    │ProjectContext│ VoteContext   │                              │
│                    │Web3AuthContext│              │                              │
│                    └──────────────┴───────────────┘                              │
│                                   │                                              │
│                    ┌──────────────┴──────────────┐                               │
│                    │       Services Layer         │                              │
│                    ├─────────────────────────────┤                               │
│                    │  api.ts (REST calls)        │                               │
│                    │  algorandAdapter.ts         │                               │
│                    │  bountyContract.ts          │                               │
│                    └─────────────────────────────┘                               │
│                                   │                                              │
│                    ┌──────────────┴──────────────┐                               │
│                    │      Wallet Integration     │                               │
│                    ├─────────────────────────────┤                               │
│                    │  use-wallet (KMD/Pera)      │                               │
│                    │  Web3Auth (Social Login)    │                               │
│                    └─────────────────────────────┘                               │
└─────────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                             BACKEND (NestJS)                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                           Controllers                                    │    │
│  ├──────────────────┬──────────────────┬──────────────────────────────────┤    │
│  │ ProjectsController│ BountiesController│ AppController                   │    │
│  └────────┬─────────┴────────┬─────────┴──────────────────────────────────┘    │
│           │                  │                                                   │
│  ┌────────┴──────────────────┴──────────────────────────────────────────────┐   │
│  │                           Services                                        │   │
│  ├──────────────────┬──────────────────┬──────────────────────────────────┤   │
│  │ ProjectsService  │ BountiesService  │ AlgorandService │ GithubService  │   │
│  └────────┬─────────┴────────┬─────────┴────────┬────────┴───────┬────────┘   │
│           │                  │                  │                │             │
│  ┌────────┴──────────────────┴──────────────────┴────────────────┴────────┐   │
│  │                        Data Access Layer                                │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │                    PrismaService (SQLite ORM)                           │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         BLOCKCHAIN (Algorand)                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                    SourceFactory Smart Contract                          │    │
│  ├──────────────────────────────────────────────────────────────────────────┤    │
│  │  Methods:                                                                 │    │
│  │  ├─ bootstrap()              - Initialize contract                       │    │
│  │  ├─ create_bounty(id, value) - Create new bounty escrow                 │    │
│  │  └─ withdraw_bounty(id, addr)- Release funds to winner                  │    │
│  │                                                                           │    │
│  │  State:                                                                   │    │
│  │  ├─ Global: managerAddress, totalBounties                                │    │
│  │  └─ Box Storage: bounties (Map<BountyId, BountyData>)                   │    │
│  └──────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Data Flow Diagram - Bounty Lifecycle

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                              BOUNTY LIFECYCLE                                  │
└───────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │   Project Owner │
                              │   (Supporter)   │
                              └────────┬────────┘
                                       │
                         1. Create Bounty Request
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                STEP 1: CREATION                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   Client                    Server                    Blockchain                 │
│   ┌─────┐                  ┌─────┐                   ┌─────────┐                │
│   │React│─POST /bounties──▶│NestJS│                  │Algorand │                │
│   │     │                  │     │─create_bounty────▶│Contract │                │
│   │     │◀─bountyId────────│     │◀─txId────────────│         │                │
│   └─────┘                  └─────┘                   └─────────┘                │
│                               │                                                  │
│                               ▼                                                  │
│                          ┌────────┐                                             │
│                          │SQLite  │ (Store bounty metadata)                     │
│                          └────────┘                                             │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              STEP 2: DISCOVERY                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   Contributor               Server                    GitHub API                 │
│   ┌─────┐                  ┌─────┐                   ┌────────┐                 │
│   │React│─GET /projects/id─▶│NestJS│─Fetch Issues───▶│ GitHub │                 │
│   │     │                  │     │◀─Issue Data──────│ GraphQL│                 │
│   │     │◀─Project+Issues──│     │                   └────────┘                 │
│   └─────┘                  └─────┘                                              │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                        2. Contributor works on issue
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            STEP 3: VERIFICATION                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   Oracle (Cron)            GitHub API                 Server                    │
│   ┌─────┐                  ┌────────┐                ┌─────┐                    │
│   │Cron │─Check PR Merge──▶│ GitHub │                │NestJS│                   │
│   │ Job │◀─Merge Confirmed─│ GraphQL│───Update──────▶│     │                   │
│   └─────┘                  └────────┘                └─────┘                    │
│                                                          │                       │
│                                                          ▼                       │
│                                                     ┌────────┐                   │
│                                                     │SQLite  │ (Mark winner)     │
│                                                     └────────┘                   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              STEP 4: CLAIM                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   Winner                    Server                    Blockchain                 │
│   ┌─────┐                  ┌─────┐                   ┌─────────┐                │
│   │React│─POST /claim──────▶│NestJS│─withdraw_bounty─▶│Algorand │               │
│   │     │                  │     │◀─txId────────────│Contract │                │
│   │     │◀─Funds Released──│     │                   └─────────┘                │
│   └─────┘                  └─────┘                                              │
│                               │                                                  │
│                               ▼                                                  │
│                          ┌────────┐                                             │
│                          │SQLite  │ (Mark as paid)                              │
│                          └────────┘                                             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Frontend-Backend Interaction Review

### 3.1 Frontend Architecture

The frontend is built with React + Vite and follows a modular component-based architecture.

| Layer | Components | Purpose |
|-------|------------|---------|
| **Pages** | `Home.tsx`, `ProjectPage.tsx`, `BountyPage.tsx`, `ProfilePage.tsx` | Route-level views |
| **Components** | `BountyCard.tsx`, `ProjectCard.tsx`, `CreateBountyModal.tsx`, etc. | Reusable UI elements |
| **Contexts** | `ProjectContext.tsx`, `VoteContext.tsx`, `Web3AuthContext.tsx` | Global state management |
| **Services** | `api.ts`, `bountyContract.ts`, `algorandAdapter.ts` | API & blockchain communication |
| **Hooks** | `useUnifiedWallet.ts`, `useLiveFeed.ts` | Custom React hooks |

### 3.2 Backend Architecture

The backend uses NestJS with a modular service-oriented architecture.

| Module | Responsibility | Key Files |
|--------|----------------|-----------|
| **AppModule** | Root module, health checks | `app.controller.ts`, `app.service.ts` |
| **ProjectsModule** | Project CRUD operations | `projects.controller.ts`, `projects.service.ts` |
| **BountiesModule** | Bounty management | `bounties.controller.ts`, `bounties.service.ts` |
| **GithubModule** | GitHub API integration | `github.service.ts` |
| **AlgorandModule** | Blockchain integration | `algorand.service.ts` |
| **PrismaModule** | Database ORM | `prisma.service.ts` |

### 3.3 Request Flow

```
┌────────────┐    HTTP    ┌────────────┐   Service   ┌────────────┐
│   React    │───────────▶│ Controller │────────────▶│  Service   │
│   Client   │            │            │             │            │
└────────────┘            └────────────┘             └────────────┘
                                                           │
                          ┌────────────────────────────────┴─────────────────┐
                          │                                                   │
                          ▼                                                   ▼
                   ┌────────────┐                                     ┌────────────┐
                   │   Prisma   │                                     │  GitHub/   │
                   │ (Database) │                                     │  Algorand  │
                   └────────────┘                                     └────────────┘
```

### 3.4 Key Integration Points

| Integration | Frontend Component | Backend Service | External System |
|-------------|-------------------|-----------------|-----------------|
| Project List | `ProjectContext` | `ProjectsService` | SQLite + GitHub API |
| Bounty Creation | `CreateBountyModal` | `BountiesService` | SQLite + Algorand |
| Wallet Connection | `useUnifiedWallet` | N/A | Pera/Defly/Web3Auth |
| GitHub Data | `ProjectDetail` | `GithubService` | GitHub GraphQL API |
| On-Chain State | `BountyCard` | `AlgorandService` | Algorand Indexer |

---

## 4. Database Requirements

### 4.1 Functional Requirements

| Requirement | Description |
|-------------|-------------|
| **Project Storage** | Store project metadata (name, description, category, creator) |
| **Repository Linking** | Associate multiple GitHub repositories with a project |
| **Bounty Tracking** | Store bounty details linked to specific GitHub issues |
| **Status Management** | Track bounty lifecycle (open → claimable → paid) |
| **Wallet Association** | Link bounties to creator wallet addresses |

### 4.2 Non-Functional Requirements

| Requirement | Implementation |
|-------------|----------------|
| **Performance** | SQLite for development, PostgreSQL for production |
| **Type Safety** | Prisma ORM with TypeScript |
| **Data Integrity** | Foreign key constraints, unique indexes |
| **Scalability** | Stateless design, ready for horizontal scaling |

### 4.3 Data Storage Strategy

| Data Type | Storage Location | Reason |
|-----------|------------------|--------|
| Project metadata | SQLite (Prisma) | Persistent, queryable |
| Repository URLs | SQLite (Prisma) | Foreign key to Project |
| Contributors | GitHub API (live) | Always current |
| Issues | GitHub API (live) | Real-time status |
| Bounty metadata | SQLite (Prisma) | Queryable, quick access |
| Bounty funds | Algorand (Box Storage) | Secure escrow |
| Payment state | Algorand (Box Storage) | Immutable record |

---

## 5. Database Schema Design

### 5.1 Prisma Schema

```prisma
// File: server/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// ============================================
// PROJECT MODEL
// Represents an open-source project on the platform
// ============================================
model Project {
  id           Int          @id @default(autoincrement())
  name         String                              // Project display name
  description  String?                             // Optional description
  category     String       @default("Tooling")    // Category (DeFi, Tooling, etc.)
  creator      String                              // Creator name or handle
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  repositories Repository[]                        // Associated GitHub repos
}

// ============================================
// REPOSITORY MODEL
// Links GitHub repositories to projects
// ============================================
model Repository {
  id        Int      @id @default(autoincrement())
  githubUrl String   @unique                       // Full GitHub URL
  projectId Int                                    // Foreign key to Project
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
}

// ============================================
// BOUNTY MODEL
// Represents a bounty attached to a GitHub issue
// ============================================
model Bounty {
  id            Int      @id @default(autoincrement())
  bountyKey     String   @unique                   // Deterministic hash for on-chain lookup
  repoOwner     String                             // GitHub repo owner
  repoName      String                             // GitHub repo name
  issueNumber   Int                                // GitHub issue number
  issueUrl      String                             // Full issue URL
  amount        Int                                // Amount in microAlgos
  creatorWallet String                             // Creator's Algorand address
  status        String   @default("open")          // open | claimable | paid
  winnerId      Int?                               // GitHub user ID of winner (nullable)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([repoOwner, repoName, issueNumber])      // Composite index for lookups
  @@index([status])                                // Filter by status
  @@index([creatorWallet])                         // Filter by creator
}
```

### 5.2 On-Chain State Schema (Algorand Smart Contract)

```typescript
// Algorand Box Storage Structure

// Box Key Format: "b__" + bountyId (uint64, 8 bytes)
// Box Value: BountyDataType struct (41 bytes total)

interface BountyDataType {
  bounty_total_value: uint64;  // 8 bytes - Total ALGO in escrow (microAlgos)
  bounty_paid: boolean;        // 1 byte  - Whether bounty has been withdrawn
  bounty_winner: Address;      // 32 bytes - Winner's wallet address
}

// Global State
interface GlobalState {
  managerAddress: Address;     // Backend service wallet (controls withdrawals)
  totalBounties: uint64;       // Counter for statistics
}
```

---

## 6. Entity-Relationship Diagrams

### 6.1 Database ER Diagram

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE SCHEMA (SQLite/Prisma)                      │
└───────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────┐         ┌───────────────────────┐
│       PROJECT         │         │      REPOSITORY       │
├───────────────────────┤         ├───────────────────────┤
│ PK id          (Int)  │◀────┐   │ PK id          (Int)  │
│    name       (String)│     │   │    githubUrl  (String)│ UNIQUE
│    description(String)│     └───│ FK projectId   (Int)  │
│    category   (String)│         │    createdAt(DateTime)│
│    creator    (String)│         │    updatedAt(DateTime)│
│    createdAt(DateTime)│         └───────────────────────┘
│    updatedAt(DateTime)│
└───────────────────────┘
         │
         │ (Virtual relationship via GitHub API)
         │
         ▼
┌───────────────────────┐
│        BOUNTY         │
├───────────────────────┤
│ PK id          (Int)  │
│    bountyKey  (String)│ UNIQUE
│    repoOwner  (String)│
│    repoName   (String)│
│    issueNumber  (Int) │
│    issueUrl   (String)│
│    amount       (Int) │
│    creatorWallet(Str) │
│    status     (String)│
│    winnerId     (Int) │ NULLABLE
│    createdAt(DateTime)│
│    updatedAt(DateTime)│
└───────────────────────┘
```

### 6.2 Relationship Descriptions

| Relationship | Type | Description |
|--------------|------|-------------|
| Project → Repository | One-to-Many | A project can have multiple GitHub repositories |
| Repository → Project | Many-to-One | Each repository belongs to exactly one project |
| Bounty → Issue | Logical Link | Bounty references a GitHub issue via owner/repo/number |
| Bounty → On-Chain | External Reference | `bountyKey` maps to Algorand box storage |

### 6.3 Virtual Entities (Live from GitHub API)

These entities are not stored in the database but fetched in real-time:

```
┌─────────────────────────────┐      ┌─────────────────────────────┐
│     CONTRIBUTOR (Virtual)   │      │       ISSUE (Virtual)        │
├─────────────────────────────┤      ├─────────────────────────────┤
│  githubHandle     (String)  │      │  number           (Int)      │
│  avatarUrl        (String)  │      │  title            (String)   │
│  contributions    (Int)     │      │  state            (String)   │
└─────────────────────────────┘      │  htmlUrl          (String)   │
                                     │  createdAt        (DateTime) │
                                     │  labels           (JSON)     │
                                     └─────────────────────────────┘
```

---

## 7. CRUD Operations

### 7.1 Project CRUD

| Operation | Endpoint | Description |
|-----------|----------|-------------|
| **Create** | `POST /projects` | Create project with repositories |
| **Read All** | `GET /projects` | List all projects (basic info) |
| **Read One** | `GET /projects/:id` | Get project with live GitHub data |
| **Update** | N/A | Not implemented (immutable) |
| **Delete** | `DELETE /projects/:id` | Remove project and repositories (cascade) |

### 7.2 Repository CRUD

| Operation | Endpoint | Description |
|-----------|----------|-------------|
| **Create** | Embedded in `POST /projects` | Created with parent project |
| **Read** | Embedded in `GET /projects/:id` | Returned with parent project |
| **Update** | N/A | Not implemented |
| **Delete** | Cascade with project | Deleted when parent is deleted |

### 7.3 Bounty CRUD

| Operation | Endpoint | Description |
|-----------|----------|-------------|
| **Create** | `POST /bounties` | Create bounty for GitHub issue |
| **Read All** | `GET /bounties` | List all bounties |
| **Read One** | `GET /bounties/:id` | Get bounty with on-chain state |
| **Update** | `PATCH /bounties/:id/claim` | Mark as claimed (internal) |
| **Delete** | N/A | Not allowed (funds locked on-chain) |

### 7.4 CRUD Implementation Examples

#### Create Project (with repositories)

```typescript
// Controller: POST /projects
@Post()
async create(@Body() createProjectDto: CreateProjectDto) {
  return this.projectsService.create(createProjectDto);
}

// Service implementation
async create(dto: CreateProjectDto) {
  return this.prisma.project.create({
    data: {
      name: dto.name,
      description: dto.description,
      category: dto.category,
      creator: dto.creator,
      repositories: {
        create: dto.repoUrls.map(url => ({ githubUrl: url }))
      }
    },
    include: { repositories: true }
  });
}
```

#### Read Project (with live GitHub data)

```typescript
// Service implementation
async findOne(id: number) {
  const project = await this.prisma.project.findUnique({
    where: { id },
    include: { repositories: true }
  });
  
  // Enrich with live GitHub data
  for (const repo of project.repositories) {
    const { owner, name } = this.parseGithubUrl(repo.githubUrl);
    repo.contributors = await this.githubService.getContributors(owner, name);
    repo.issues = await this.githubService.getIssues(owner, name);
  }
  
  return project;
}
```

---

## 8. API Contract

### 8.1 API Overview

| Base URL | `http://localhost:3000` |
|----------|-------------------------|
| Content-Type | `application/json` |
| API Documentation | `http://localhost:3000/api` (Swagger) |

### 8.2 Projects Endpoints

#### POST /projects

**Create a new project with GitHub repositories**

**Request:**
```http
POST /projects
Content-Type: application/json

{
  "name": "WeSource Platform",
  "description": "Decentralized bounty platform for open source",
  "category": "DeFi",
  "creator": "Arthur Rabelo",
  "repoUrls": [
    "https://github.com/p2arthur/WeSource_monorepo"
  ]
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "name": "WeSource Platform",
  "description": "Decentralized bounty platform for open source",
  "category": "DeFi",
  "creator": "Arthur Rabelo",
  "createdAt": "2025-01-20T10:30:00.000Z",
  "updatedAt": "2025-01-20T10:30:00.000Z",
  "repositories": [
    {
      "id": 1,
      "githubUrl": "https://github.com/p2arthur/WeSource_monorepo",
      "projectId": 1,
      "createdAt": "2025-01-20T10:30:00.000Z",
      "updatedAt": "2025-01-20T10:30:00.000Z"
    }
  ]
}
```

**Validation:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `name` | string | ✅ | Non-empty |
| `description` | string | ❌ | Optional |
| `category` | string | ✅ | Non-empty |
| `creator` | string | ✅ | Non-empty |
| `repoUrls` | string[] | ✅ | Valid GitHub URLs, non-empty array |

---

#### GET /projects

**List all projects (basic info only)**

**Request:**
```http
GET /projects
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "WeSource Platform",
      "description": "Decentralized bounty platform",
      "category": "DeFi",
      "creator": "Arthur Rabelo",
      "createdAt": "2025-01-20T10:30:00.000Z",
      "updatedAt": "2025-01-20T10:30:00.000Z",
      "repositories": [
        {
          "id": 1,
          "githubUrl": "https://github.com/p2arthur/WeSource_monorepo"
        }
      ]
    }
  ],
  "total": 1
}
```

---

#### GET /projects/:id

**Get project with live GitHub data (contributors, issues)**

**Request:**
```http
GET /projects/1
```

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "WeSource Platform",
  "description": "Decentralized bounty platform",
  "category": "DeFi",
  "creator": "Arthur Rabelo",
  "createdAt": "2025-01-20T10:30:00.000Z",
  "updatedAt": "2025-01-20T10:30:00.000Z",
  "repositories": [
    {
      "id": 1,
      "githubUrl": "https://github.com/p2arthur/WeSource_monorepo",
      "name": "WeSource_monorepo",
      "stars": 15,
      "description": "Full-stack bounty platform on Algorand",
      "contributors": [
        {
          "githubHandle": "p2arthur",
          "avatarUrl": "https://avatars.githubusercontent.com/u/12345?v=4"
        }
      ],
      "issues": [
        {
          "id": 123456789,
          "number": 42,
          "title": "Implement bounty stacking feature",
          "state": "open",
          "htmlUrl": "https://github.com/p2arthur/WeSource_monorepo/issues/42",
          "createdAt": "2025-01-15T09:00:00.000Z",
          "updatedAt": "2025-01-18T14:30:00.000Z",
          "user": {
            "login": "p2arthur",
            "avatarUrl": "https://avatars.githubusercontent.com/u/12345?v=4"
          },
          "labels": [
            { "name": "enhancement", "color": "a2eeef" },
            { "name": "bounty", "color": "0e8a16" }
          ]
        }
      ]
    }
  ]
}
```

---

#### DELETE /projects/:id

**Delete a project and all associated repositories**

**Request:**
```http
DELETE /projects/1
```

**Response (200 OK):**
```json
{
  "message": "Project deleted successfully"
}
```

---

### 8.3 Bounties Endpoints

#### POST /bounties

**Create a new bounty for a GitHub issue**

**Request:**
```http
POST /bounties
Content-Type: application/json

{
  "repoOwner": "p2arthur",
  "repoName": "WeSource_monorepo",
  "issueNumber": 42,
  "amount": 10000000,
  "creatorWallet": "ABCD1234..."
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "bountyKey": "5381928374651029",
  "repoOwner": "p2arthur",
  "repoName": "WeSource_monorepo",
  "issueNumber": 42,
  "issueUrl": "https://github.com/p2arthur/WeSource_monorepo/issues/42",
  "amount": 10000000,
  "creatorWallet": "ABCD1234...",
  "status": "open",
  "winnerId": null,
  "createdAt": "2025-01-20T10:30:00.000Z",
  "updatedAt": "2025-01-20T10:30:00.000Z"
}
```

**Notes:**
- `bountyKey` is computed deterministically from `repoOwner|repoName|issueNumber`
- `amount` is in microAlgos (1 ALGO = 1,000,000 microAlgos)

---

#### GET /bounties

**List all bounties**

**Request:**
```http
GET /bounties
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "bountyKey": "5381928374651029",
    "repoOwner": "p2arthur",
    "repoName": "WeSource_monorepo",
    "issueNumber": 42,
    "issueUrl": "https://github.com/p2arthur/WeSource_monorepo/issues/42",
    "amount": 10000000,
    "creatorWallet": "ABCD1234...",
    "status": "open",
    "winnerId": null,
    "createdAt": "2025-01-20T10:30:00.000Z",
    "updatedAt": "2025-01-20T10:30:00.000Z"
  }
]
```

---

#### GET /bounties/:id

**Get a specific bounty with on-chain state**

**Request:**
```http
GET /bounties/1
```

**Response (200 OK):**
```json
{
  "id": 1,
  "bountyKey": "5381928374651029",
  "repoOwner": "p2arthur",
  "repoName": "WeSource_monorepo",
  "issueNumber": 42,
  "issueUrl": "https://github.com/p2arthur/WeSource_monorepo/issues/42",
  "amount": 10000000,
  "creatorWallet": "ABCD1234...",
  "status": "open",
  "winnerId": null,
  "createdAt": "2025-01-20T10:30:00.000Z",
  "updatedAt": "2025-01-20T10:30:00.000Z",
  "onChainState": {
    "totalValue": 10000000,
    "isPaid": false,
    "winnerAddress": null
  }
}
```

---

### 8.4 Smart Contract Methods (Algorand)

| Method | Signature | Description | Authorization |
|--------|-----------|-------------|---------------|
| `bootstrap` | `bootstrap()void` | Initialize contract | Manager only |
| `create_bounty` | `create_bounty(uint64,uint64)void` | Create bounty escrow | Any user |
| `withdraw_bounty` | `withdraw_bounty(uint64,address)void` | Release funds to winner | Manager only |

---

### 8.5 Error Response Format

All API errors follow a consistent format:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

**HTTP Status Codes:**

| Code | Meaning | Example |
|------|---------|---------|
| 400 | Bad Request | Invalid input data |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | GitHub rate limit exceeded |
| 500 | Internal Server Error | Server-side failure |
| 502 | Bad Gateway | GitHub API error |
| 503 | Service Unavailable | Cannot connect to GitHub |

---

## 9. Authorization & Security

### 9.1 Current Implementation (MVP)

| Aspect | Current State | Notes |
|--------|---------------|-------|
| API Authentication | None | All endpoints are public |
| Wallet Verification | Client-provided | Wallet address passed in request body |
| Withdrawal Authorization | Manager wallet | Only backend service can trigger withdrawals |
| Rate Limiting | GitHub rate limits | 5,000 requests/hour with token |

### 9.2 Security Measures

| Measure | Implementation |
|---------|----------------|
| Environment Variables | Sensitive data in `.env` files |
| Manager Mnemonic | Backend only, never exposed to client |
| On-Chain Verification | Smart contract validates manager address |
| Input Validation | NestJS class-validator decorators |

### 9.3 Future Security Enhancements

| Enhancement | Description |
|-------------|-------------|
| Web3Auth JWT Validation | Verify social login tokens on backend |
| Wallet Signature Verification | Require signed messages for claims |
| Rate Limiting | Per-wallet request throttling |
| CORS Configuration | Restrict origins in production |

---

## 10. Technology Stack Summary

### 10.1 Complete Stack Overview

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18 + Vite | Single Page Application |
| **Styling** | Tailwind CSS | Utility-first CSS framework |
| **State Management** | React Context | Global state (projects, auth, votes) |
| **Wallet Integration** | use-wallet + Web3Auth | Multi-wallet support |
| **Backend** | NestJS | REST API server |
| **ORM** | Prisma | Type-safe database access |
| **Database** | SQLite (dev) / PostgreSQL (prod) | Data persistence |
| **Blockchain** | Algorand (PuyaTs) | Smart contracts |
| **External APIs** | GitHub GraphQL/REST | Repository data |

### 10.2 Development Commands

```bash
# Start local development environment
cd client && npm run dev      # Frontend at http://localhost:5173
cd server && npm run start:dev # Backend at http://localhost:3000

# Smart contracts
cd contracts && npm run build  # Compile contracts
cd contracts && npm run test   # Run contract tests

# Database
cd server && npx prisma migrate dev    # Run migrations
cd server && npx prisma studio         # Open DB GUI
```

### 10.3 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRODUCTION DEPLOYMENT                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Vercel    │    │   Railway   │    │  Algorand   │         │
│  │  (Frontend) │    │  (Backend)  │    │  (TestNet)  │         │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘         │
│         │                  │                  │                 │
│         └────────┬─────────┴──────────────────┘                 │
│                  │                                               │
│           ┌──────┴──────┐                                       │
│           │  PostgreSQL │                                       │
│           │  (Railway)  │                                       │
│           └─────────────┘                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Appendix A: File Structure

```
WeSource/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── contexts/          # React contexts
│   │   ├── hooks/             # Custom hooks
│   │   ├── pages/             # Route pages
│   │   ├── services/          # API layer
│   │   └── contracts/         # Generated clients
│   └── package.json
├── server/                    # NestJS backend
│   ├── src/
│   │   ├── projects/          # Projects module
│   │   ├── bounties/          # Bounties module
│   │   ├── github/            # GitHub integration
│   │   ├── algorand/          # Blockchain integration
│   │   └── prisma/            # Database module
│   └── prisma/
│       └── schema.prisma      # Database schema
└── contracts/                 # Algorand smart contracts
    └── smart_contracts/
        └── source_factory/    # SourceFactory contract
```

---

## Appendix B: Environment Variables

```bash
# Server (.env)
DATABASE_URL="file:./dev.db"
GITHUB_TOKEN="ghp_xxxxxxxxxxxx"
ALGOD_SERVER="http://localhost"
ALGOD_PORT="4001"
ALGOD_TOKEN="aaaaaaaaaa..."
SOURCE_FACTORY_APP_ID="12345"
MANAGER_MNEMONIC="word1 word2 ..."

# Client (.env)
VITE_API_URL="http://localhost:3000"
VITE_ALGOD_SERVER="http://localhost"
VITE_ALGOD_PORT="4001"
```

---

*Document generated for CCTB Capstone Project - Milestone 2*

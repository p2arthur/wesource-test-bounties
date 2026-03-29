# Backend Agent — Transaction History (Final MVP Feature)

**Role:** Backend Engineer — NestJS, Prisma, PostgreSQL
**Scope:** `/server` — 1 new model + 1 new endpoint + hook into existing flows
**Urgency:** Last feature before MVP is declared done.

---

## Context

All 13 audit features are complete except #10: Transaction History. The frontend needs a timeline of bounty events per user. This requires a dedicated Transaction model (bounty status only shows current state, not history).

---

## Task 1: Transaction Model + Service + Endpoint

### Schema

Add to `prisma/schema.prisma`:

```prisma
enum TransactionType {
  BOUNTY_CREATED
  BOUNTY_CLAIMED
  BOUNTY_REFUNDED
  BOUNTY_REVOKED
  BOUNTY_CANCELLED
}

model Transaction {
  id            Int             @id @default(autoincrement())
  walletAddress String
  type          TransactionType
  bountyId      Int
  bounty        Bounty          @relation(fields: [bountyId], references: [id])
  amount        Int             // microAlgos
  createdAt     DateTime        @default(now())

  @@index([walletAddress])
  @@index([bountyId])
}
```

Also add relation to Bounty model:
```prisma
model Bounty {
  // ... existing fields
  transactions Transaction[]
}
```

**Migration:** `npx prisma migrate dev --name add_transactions`

### Service

Create `src/transactions/transactions.service.ts`:

```ts
@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(walletAddress: string, type: TransactionType, bountyId: number, amount: number) {
    return this.prisma.transaction.create({
      data: { walletAddress, type, bountyId, amount },
    });
  }

  async findByWallet(walletAddress: string) {
    return this.prisma.transaction.findMany({
      where: { walletAddress },
      include: {
        bounty: {
          select: {
            id: true,
            issueNumber: true,
            issueUrl: true,
            repository: { select: { githubUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
```

### Controller

Create `src/transactions/transactions.controller.ts`:

```ts
@ApiTags('Transactions')
@Controller('api/users/:walletAddress/transactions')
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get transaction history for a user' })
  @ApiParam({ name: 'walletAddress', description: 'User wallet address' })
  @ApiResponse({ status: 200, description: 'Transaction history' })
  findAll(@Param('walletAddress') walletAddress: string) {
    return this.transactionsService.findByWallet(walletAddress);
  }
}
```

**Response shape:**
```json
[
  {
    "id": 1,
    "walletAddress": "ABCD...",
    "type": "BOUNTY_CREATED",
    "bountyId": 5,
    "amount": 1000000,
    "createdAt": "2026-03-29T...",
    "bounty": {
      "id": 5,
      "issueNumber": 42,
      "issueUrl": "https://github.com/org/repo/issues/42",
      "repository": { "githubUrl": "https://github.com/org/repo" }
    }
  }
]
```

### Wire into existing flows

In `bounties.service.ts`, add `TransactionsService.create()` calls at these points:

1. **After bounty creation** — `BOUNTY_CREATED` with creatorWallet + amount
2. **After claim succeeds** — `BOUNTY_CLAIMED` with winnerWallet + amount
3. **After refund succeeds** — `BOUNTY_REFUNDED` with creatorWallet + amount
4. **After revoke succeeds** — `BOUNTY_REVOKED` with creatorWallet + amount
5. **When oracle marks CANCELLED** — `BOUNTY_CANCELLED` with creatorWallet + amount

### Module

Create `src/transactions/transactions.module.ts`, export `TransactionsService`.
Register in `app.module.ts`. Inject `TransactionsService` into `BountiesModule`.

---

## Rules

1. Follow existing patterns (see bounties.service.ts, notifications service)
2. Swagger decorators on endpoint
3. Write at least one test for the endpoint
4. `npm run build` must pass
5. Commit with message: `feat: transaction history model + endpoint`

---

## Reference

- **Prisma schema:** `prisma/schema.prisma`
- **Bounties service:** `src/bounties/bounties.service.ts` (where to add transaction writes)
- **App module:** `src/app.module.ts` (module registration)
- **Notifications module:** `src/notifications/` (similar pattern — follow it)

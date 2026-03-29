# Backend Agent — Phase 7 Quick Wins

**Role:** Backend Engineer — NestJS, Prisma, PostgreSQL
**Scope:** `/server` — 3 endpoints to unblock frontend
**Urgency:** HIGH — frontend is blocked on these

---

## Context

Frontend functional MVP (Phases 3-7.1) is complete and merged to main. Phases 7.2 (Pagination) and 7.3 (Notifications) are blocked by missing backend endpoints. Phase 6 (User Profiles) also needs the user profile endpoint.

Frontend dev has documented exact requirements in `BACKEND_STATUS.md` in the client folder.

---

## Task 1: Pagination for GET /api/bounties (Phase 7.2)

**File:** `src/bounties/bounties.controller.ts` + `src/bounties/bounties.service.ts`

**What to do:**
1. Add `@Query('page')` and `@Query('limit')` parameters to the `@Get()` list method in the controller
2. Update `bountiesService.list()` to accept pagination params
3. Use Prisma's `skip` and `take`:
   ```ts
   const skip = (page - 1) * limit;
   const bounties = await this.prisma.bounty.findMany({ skip, take: limit, ... });
   ```
4. Return paginated response:
   ```ts
   {
     data: BountyResponseDto[],
     total: number,
     page: number,
     limit: number,
     totalPages: number
   }
   ```
5. Default: `page=1`, `limit=20`
6. Add `@ApiQuery` decorators for Swagger docs

**Test:** `curl 'http://localhost:3000/api/bounties?page=1&limit=5'` returns 5 items with total count.

---

## Task 2: Pagination for GET /projects (Phase 7.2)

**File:** `src/projects/projects.controller.ts` + `src/projects/projects.service.ts`

**Same pattern as Task 1:**
1. Add `@Query('page')` and `@Query('limit')` to `@Get()` method
2. Update `projectsService.findAll()` to use Prisma `skip`/`take`
3. Return paginated response with same shape as bounties
4. Default: `page=1`, `limit=20`

**Test:** `curl 'http://localhost:3000/projects?page=1&limit=5'` returns 5 projects with total count.

---

## Task 3: GET /api/users/:walletAddress (Phase 6)

**File:** `src/auth/auth.service.ts` (add method) + create `src/auth/auth.controller.ts` or add route to existing controller

**What to do:**
1. Add method to `AuthService`:
   ```ts
   async getUserProfile(walletAddress: string) {
     const user = await this.prisma.user.findFirst({ where: { wallet: walletAddress } });
     if (!user) return null;

     const bountiesCreated = await this.prisma.bounty.count({ where: { creatorWallet: walletAddress } });
     const bountiesWon = await this.prisma.bounty.count({ where: { winnerId: user.id } });

     return {
       id: user.id,
       username: user.username,
       wallet: user.wallet,
       bountiesCreated,
       bountiesWon,
       joinedAt: user.createdAt,
     };
   }
   ```
2. Add controller route:
   ```ts
   @Get('api/users/:walletAddress')
   @ApiOperation({ summary: 'Get user profile by wallet address' })
   getUserProfile(@Param('walletAddress') walletAddress: string) {
     return this.authService.getUserProfile(walletAddress);
   }
   ```
3. No auth required (public profile data)

**Test:** `curl http://localhost:3000/api/users/ABCD1234...` returns user profile or 404.

---

## Task 4: Notifications Infrastructure (Phase 7.3)

**Priority:** MEDIUM — frontend can work without it, but it's the last feature.

**Schema change:** Add Notification model to `prisma/schema.prisma`:
```prisma
model Notification {
  id        Int      @id @default(autoincrement())
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  type      String   // "bounty_won", "bounty_claimed", "refund_available"
  message   String
  bountyId  Int?
  bounty    Bounty?  @relation(fields: [bountyId], references: [id])
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

Also add relation to User model:
```prisma
model User {
  // ... existing fields
  notifications Notification[]
}
```

And optional relation to Bounty:
```prisma
model Bounty {
  // ... existing fields
  notifications Notification[]
}
```

**Migration:** `npx prisma migrate dev --name add_notifications`

**Service + Controller:**
1. Create `src/notifications/notifications.service.ts` with:
   - `create(userId, type, message, bountyId?)` — create notification
   - `findByUser(walletAddress)` — list all for user (newest first)
   - `markAsRead(id)` — set read=true
   - `getUnreadCount(walletAddress)` — count where read=false

2. Create `src/notifications/notifications.controller.ts` with:
   - `GET /api/notifications?wallet=ABCD...` — list notifications
   - `PATCH /api/notifications/:id/read` — mark as read
   - `GET /api/notifications/unread-count?wallet=ABCD...` — unread count

3. Add `NotificationsModule` to `app.module.ts`

4. Wire up oracle to create notifications when:
   - Bounty winner is set → `bounty_won` notification
   - Bounty becomes REFUNDABLE → `refund_available` notification

**Test:** Create notification, fetch by wallet, mark as read.

---

## Rules

1. **Use existing patterns.** Look at bounties.controller.ts and bounties.service.ts for NestJS conventions.
2. **PrismaService injection** is already set up — use `this.prisma`.
3. **Swagger decorators** on all new endpoints (`@ApiOperation`, `@ApiResponse`, `@ApiQuery`).
4. **Tests:** Write at least one spec for each new endpoint.
5. **Commit after each task** (4 commits total).
6. **`npm run build` must pass** after each task.
7. **Update `MEMORY.md`** with decisions.

---

## Reference

- **Prisma schema:** `prisma/schema.prisma`
- **Bounties controller:** `src/bounties/bounties.controller.ts` (existing patterns)
- **Bounties service:** `src/bounties/bounties.service.ts` (Prisma queries)
- **Auth service:** `src/auth/auth.service.ts` (User model queries)
- **App module:** `src/app.module.ts` (module registration)
- **Existing DTOs:** `src/bounties/dto/` (response DTO patterns)

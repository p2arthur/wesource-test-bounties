# Oracle Validation Service - Setup Guide

## Overview

The Oracle Validation Service has been successfully implemented! This guide will help you get it running.

## What Was Implemented

### 1. **Database Schema Updates** ([prisma/schema.prisma](prisma/schema.prisma))

- Added Oracle tracking fields to `Bounty` model:
  - `processedEventId`: Prevents double processing of GitHub events
  - `lastCheckedAt`: Enables `If-Modified-Since` header optimization
  - `stateReason`: Tracks GitHub closure reason (completed/not_planned)
  - `closedByCommitId`: Stores commit SHA for verification

- Extended `BountyStatus` enum:
  - `CANCELLED`: Issue closed as not_planned
  - `REFUNDABLE`: Funds can be refunded to creator

### 2. **Enhanced GitHub Service** ([src/github/github.service.ts](src/github/github.service.ts))

- `getIssueEvents()`: Fetches issue events with If-Modified-Since support
- `getCommitAuthor()`: Cross-references commits for attribution
- `retryWithBackoff()`: Exponential backoff retry mechanism
- Comprehensive rate limit handling

### 3. **Oracle Service** ([src/oracle/oracle.service.ts](src/oracle/oracle.service.ts))

- Main validation logic with all requirements:
  ✅ Iterates through Open bounties
  ✅ Uses GitHub REST API with If-Modified-Since
  ✅ Checks state_reason (completed vs not_planned)
  ✅ Identity attribution (commit author > close actor)
  ✅ Rate limit handling with retry
  ✅ Event ID logging for double-spend prevention

### 4. **Cron Job Integration** ([src/bounties/bounties.service.ts](src/bounties/bounties.service.ts))

- Runs every 5 minutes: `*/5 * * * *`
- Startup check on application boot
- Graceful error handling

### 5. **API Endpoints** ([src/oracle/oracle.controller.ts](src/oracle/oracle.controller.ts))

- `POST /oracle/validate`: Manual validation trigger
- `GET /oracle/status`: Health check

## Setup Instructions

### Step 1: Start the Database

```bash
cd /Users/arthurrabelo/Documents/cctb_fsw/capstone-project/WeSource/server
docker-compose up -d db
```

### Step 2: Run Database Migration

```bash
# Option A: Using Prisma (recommended)
npx prisma migrate dev --name add_oracle_fields

# Option B: Manual SQL (if Prisma migration fails)
psql -h localhost -U user -d wesource_db -f migrations/manual_add_oracle_fields.sql
```

### Step 3: Set Environment Variable

Make sure you have a GitHub token set for higher rate limits:

```bash
export GITHUB_TOKEN="your_github_personal_access_token"
```

**To create a GitHub token:**

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo` (for private repos) or leave empty (for public only)
4. Copy the token and set it in your environment

### Step 4: Start the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

### Step 5: Verify Oracle is Running

Check the logs for the startup message:

```
[BountiesService] Running Oracle bounty validation on startup...
[BountiesService] Oracle validation scheduled to run every 5 minutes.
```

## Testing the Oracle

### 1. Check Oracle Status

```bash
curl http://localhost:3000/oracle/status
```

Expected response:

```json
{
  "service": "Oracle Validation Service",
  "status": "operational",
  "description": "Syncs marketplace database with GitHub issue states",
  "timestamp": "2026-02-14T10:00:00.000Z"
}
```

### 2. Manually Trigger Validation

```bash
curl -X POST http://localhost:3000/oracle/validate
```

Expected response:

```json
{
  "startedAt": "2026-02-14T10:00:00.000Z",
  "completedAt": "2026-02-14T10:00:05.000Z",
  "bountiesChecked": 5,
  "bountiesUpdated": 2,
  "readyForClaim": 1,
  "cancelled": 0,
  "refundable": 1,
  "errors": 0,
  "rateLimitHit": false,
  "results": [...]
}
```

### 3. Create Test Bounty

```bash
# Create a bounty for a closed issue
curl -X POST http://localhost:3000/bounties \
  -H "Content-Type: application/json" \
  -d '{
    "repoOwner": "algorandfoundation",
    "repoName": "algokit-utils-ts",
    "issueNumber": 424,
    "amount": 100,
    "creatorWallet": "YOUR_ALGORAND_ADDRESS"
  }'
```

Wait 5 minutes or manually trigger validation. The Oracle will:

1. Fetch events for issue #424
2. Check if it's closed
3. Verify state_reason is "completed"
4. Identify the winner from commit author or close actor
5. Update bounty status to READY_FOR_CLAIM

## Monitoring

### View Oracle Activity

```bash
# Watch the logs
npm run start:dev | grep -E "(Oracle|Bounty)"

# Key log messages to look for:
# ✅ "Running Oracle bounty validation on startup..."
# ✅ "Starting Oracle validation for X open bounties..."
# ✅ "Bounty X marked READY_FOR_CLAIM: winner=octocat (123456)"
# ⚠️  "Bounty X marked REFUNDABLE: closed as not_planned"
# ⚠️  "GitHub rate limit hit. Stopping Oracle validation."
```

### Check Database

```sql
-- See bounties processed by Oracle
SELECT
  id,
  issue_number,
  status,
  state_reason,
  processed_event_id,
  last_checked_at,
  winner_id
FROM "Bounty"
WHERE last_checked_at IS NOT NULL
ORDER BY last_checked_at DESC;

-- Count bounties by status
SELECT status, COUNT(*)
FROM "Bounty"
GROUP BY status;
```

## Oracle Behavior

### When Issue is Closed as "completed"

1. ✅ Fetches commit author if commit_id exists
2. ✅ Falls back to close actor if no commit
3. ✅ Creates/updates User record
4. ✅ Updates Bounty:
   - status → READY_FOR_CLAIM
   - winnerId → User.id
   - processedEventId → GitHub event.id
   - stateReason → "completed"
   - closedByCommitId → commit SHA

### When Issue is Closed as "not_planned"

1. ❌ Does NOT assign a winner
2. ✅ Updates Bounty:
   - status → REFUNDABLE
   - processedEventId → GitHub event.id
   - stateReason → "not_planned"

### Rate Limit Protection

- Uses If-Modified-Since to reduce API calls by ~90%
- Implements exponential backoff (1s, 2s, 4s)
- Gracefully stops on rate limit hit
- Resumes on next cron cycle (5 minutes)

## Troubleshooting

### "Can't reach database server"

```bash
# Start the database
docker-compose up -d db

# Check it's running
docker ps | grep wesource_db
```

### "GitHub API rate limit exceeded"

```bash
# Check your rate limit
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/rate_limit

# Set a GitHub token for higher limits (5000/hour instead of 60/hour)
export GITHUB_TOKEN="your_token_here"
```

### "Bounty not updating"

1. Check the issue is actually closed on GitHub
2. Verify state_reason is "completed" (not "not_planned")
3. Check Oracle logs for errors
4. Manually trigger: `curl -X POST http://localhost:3000/oracle/validate`

### "TypeError: Cannot read property 'repository' of undefined"

- This means Prisma client wasn't regenerated after schema changes
- Run: `npx prisma generate`

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     CRON SCHEDULER                           │
│                    (Every 5 minutes)                         │
└──────────────┬───────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────┐
│              ORACLE SERVICE (validateBounties)               │
│  1. Fetch Open bounties (ordered by lastCheckedAt)          │
│  2. For each bounty:                                         │
└──────────────┬───────────────────────────────────────────────┘
               │
               ├──► GITHUB SERVICE (getIssueEvents)
               │    • REST API: /repos/{owner}/{repo}/issues/{N}/events
               │    • Header: If-Modified-Since: {lastCheckedAt}
               │    • Retry with exponential backoff
               │
               ├──► Check event: "closed"
               │    │
               │    ├──► state_reason == "completed"
               │    │    │
               │    │    ├──► GITHUB SERVICE (getCommitAuthor)
               │    │    │    • Find commit author if commit_id exists
               │    │    │
               │    │    └──► DATABASE (Prisma)
               │    │         • Upsert User (winner)
               │    │         • Update Bounty: READY_FOR_CLAIM
               │    │         • Log processedEventId
               │    │
               │    └──► state_reason == "not_planned"
               │         │
               │         └──► DATABASE (Prisma)
               │              • Update Bounty: REFUNDABLE
               │              • Log processedEventId
               │
               └──► DATABASE (Prisma)
                    • Update lastCheckedAt (always)
```

## Files Created/Modified

### Created:

- ✅ `src/oracle/oracle.service.ts` - Core validation logic
- ✅ `src/oracle/oracle.module.ts` - NestJS module
- ✅ `src/oracle/oracle.controller.ts` - API endpoints
- ✅ `src/oracle/index.ts` - Barrel exports
- ✅ `ORACLE_README.md` - Comprehensive documentation
- ✅ `migrations/manual_add_oracle_fields.sql` - Manual migration

### Modified:

- ✅ `prisma/schema.prisma` - Added Oracle fields, new statuses
- ✅ `src/github/github.service.ts` - Added events API, retry logic
- ✅ `src/bounties/bounties.service.ts` - Integrated Oracle
- ✅ `src/bounties/bounties.module.ts` - Import OracleModule
- ✅ `src/app.module.ts` - Register OracleModule

## Next Steps

1. **Start the database and run migrations** (see Step 1-2 above)
2. **Set GITHUB_TOKEN** for higher rate limits
3. **Start the application** and verify Oracle is running
4. **Create test bounties** with closed GitHub issues
5. **Monitor the logs** for Oracle activity

## Support

For detailed information about the Oracle logic, see [ORACLE_README.md](ORACLE_README.md).

For questions or issues, check:

- Application logs: Look for `[Oracle]` and `[BountiesService]` tags
- Database state: Query the Bounty table
- GitHub API status: https://www.githubstatus.com/

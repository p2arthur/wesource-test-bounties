# Oracle Validation Service

## Overview

The **Oracle Service** is a Web3 Oracle that validates and syncs the WeSource marketplace database with the source of truth: GitHub issue states. It runs automatically via cron jobs and ensures that bounty statuses accurately reflect the real-world state of GitHub issues.

## Architecture

```
┌─────────────────┐
│  Cron Schedule  │ (Every 5 minutes)
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│   BountiesService       │
│  - scheduleMonitoring() │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│    OracleService        │
│  - validateBounties()   │
└────────┬────────────────┘
         │
         ├──► GitHub REST API (Issue Events)
         │    - If-Modified-Since optimization
         │    - Rate limit handling
         │    - Exponential backoff retry
         │
         └──► Database (Prisma)
              - Update bounty status
              - Log processed events
              - Prevent double processing
```

## Core Logic

### 1. **Iteration**

Fetches all bounties where `status == 'OPEN'` from the database, ordered by `lastCheckedAt` (oldest first).

### 2. **GitHub API Request**

For each open bounty, calls the GitHub REST API:

```
GET /repos/{owner}/{repo}/issues/{issue_number}/events
```

**Optimization**: Uses `If-Modified-Since` header with `lastCheckedAt` timestamp to save API quota.

### 3. **Win Condition Identification**

#### State Reason Check

- Scans events for `event: "closed"`
- **CRITICAL**: Checks `state_reason` field:
  - `"completed"` → Eligible for payout (proceed to identity attribution)
  - `"not_planned"` → Mark bounty as `REFUNDABLE` (no payout)
  - Other values → Skip (log and continue monitoring)

#### Identity Attribution

When a valid closure (`state_reason == "completed"`) is found:

1. **Priority 1 - Commit Author Verification**
   - If `commit_id` is present in the closed event
   - Cross-reference the commit via:
     ```
     GET /repos/{owner}/{repo}/commits/{commit_sha}
     ```
   - Extract the commit author's `id` and `login`

2. **Priority 2 - Closed By Actor**
   - If no commit_id or commit author not found
   - Use the `actor` field from the closed event
   - Extract the actor's `id` and `login`

3. **Winner Assignment**
   - Upsert the winner into the `User` table
   - Update bounty:
     - `status` → `READY_FOR_CLAIM`
     - `winnerId` → Winner's database ID
     - `processedEventId` → GitHub event ID (prevents double processing)
     - `stateReason` → "completed"
     - `closedByCommitId` → Commit SHA (if available)

### 4. **Data Integrity**

#### Rate Limit Handling

- Monitors `X-RateLimit-Remaining` header
- If rate limit exceeded (HTTP 403):
  - Logs warning with reset time
  - Stops current validation cycle
  - Returns partial results
  - Next cron cycle will resume

#### Retry Mechanism

- Exponential backoff with jitter
- Default: 3 retries, base delay 1000ms
- Backoff formula: `delay = baseDelay * 2^attempt + jitter`
- Does NOT retry on 404 or 400 errors (permanent failures)

#### Double Spend Prevention

- Stores `processedEventId` in database
- Skips events already processed: `event.id <= bounty.processedEventId`
- Ensures each closure event is processed exactly once

#### Last Checked Tracking

- Updates `lastCheckedAt` timestamp after each check
- Enables efficient `If-Modified-Since` requests
- Reduces API quota consumption by ~90%

## API Endpoints

### Manual Validation Trigger

```bash
POST /oracle/validate
```

Manually triggers Oracle validation (useful for testing or immediate sync).

**Response**:

```json
{
  "startedAt": "2026-02-14T10:00:00Z",
  "completedAt": "2026-02-14T10:00:05Z",
  "bountiesChecked": 42,
  "bountiesUpdated": 3,
  "readyForClaim": 2,
  "cancelled": 0,
  "refundable": 1,
  "errors": 0,
  "rateLimitHit": false,
  "results": [
    {
      "bountyId": 5,
      "issueNumber": 424,
      "status": "processed",
      "action": "ready_for_claim",
      "winner": {
        "githubId": 123456,
        "login": "octocat"
      },
      "stateReason": "completed",
      "eventId": 78901234
    }
  ]
}
```

### Status Check

```bash
GET /oracle/status
```

Returns Oracle service health status.

## Database Schema

### New Bounty Fields

```prisma
model Bounty {
  // ... existing fields ...

  // Oracle tracking fields
  processedEventId BigInt?   @map("processed_event_id")
  lastCheckedAt    DateTime? @map("last_checked_at")
  stateReason      String?   @map("state_reason")
  closedByCommitId String?   @map("closed_by_commit_id")
}
```

### New Status Values

```prisma
enum BountyStatus {
  OPEN           // Bounty active, issue open
  READY_FOR_CLAIM // Issue closed as "completed", winner identified
  CLAIMED        // Winner has claimed and received payment
  CANCELLED      // Issue closed as "not_planned"
  REFUNDABLE     // Funds available for refund to creator
}
```

## Cron Schedule

- **Frequency**: Every 5 minutes
- **Configured in**: `BountiesService.scheduleMonitoring()`
- **Pattern**: `*/5 * * * *`

To change the schedule, modify:

```typescript
// src/bounties/bounties.service.ts
cron.schedule('*/5 * * * *', async () => {
  await this.runOracleValidation();
  await this.syncFromChain();
});
```

## Error Handling

### Rate Limit Exceeded

```
[Oracle] GitHub rate limit hit. Stopping Oracle validation.
```

- Stops current cycle gracefully
- Returns partial results
- Next cycle will resume from where it left off

### Network Errors

- Automatic retry with exponential backoff
- Max 3 attempts per request
- Logs all retry attempts

### Invalid GitHub URLs

```
[Oracle] Invalid GitHub URL for bounty 42: https://invalid-url
```

- Skips the bounty
- Logs error
- Continues processing remaining bounties

### No Winner Identified

```
[Oracle] Bounty 42 (owner/repo#123): Issue closed as completed but no winner identified
```

- Occurs when neither `commit_id` nor `actor` is available
- Bounty remains OPEN
- Will retry on next cycle

## Testing

### Manual Trigger

```bash
curl -X POST http://localhost:3000/oracle/validate
```

### Check Status

```bash
curl http://localhost:3000/oracle/status
```

### Monitor Logs

```bash
# Check Oracle validation results
grep "Oracle validation" logs/app.log

# Check for rate limit issues
grep "rate limit" logs/app.log
```

## Performance

- **If-Modified-Since** reduces API calls by ~90%
- **Batch processing** with small delays (100ms between bounties)
- **Parallel-safe**: Uses `syncInProgress` flag to prevent concurrent runs
- **Efficient queries**: Database queries optimized with indexes on `status` and `lastCheckedAt`

## Security Considerations

1. **GITHUB_TOKEN Required**: Set environment variable for higher rate limits
2. **Event ID Verification**: Prevents replay attacks / double processing
3. **State Reason Validation**: Only "completed" closures trigger payouts
4. **Commit Verification**: Cross-references commits for accurate attribution

## Monitoring

Key metrics to track:

- `bountiesChecked`: Total bounties validated per cycle
- `bountiesUpdated`: Bounties with status changes
- `readyForClaim`: Bounties marked for payout
- `refundable`: Bounties eligible for refund
- `errors`: Failed validations
- `rateLimitHit`: API quota exhaustion

## Future Enhancements

1. **Webhook Integration**: Replace polling with GitHub webhooks for real-time updates
2. **Multi-chain Support**: Extend Oracle to support multiple blockchain networks
3. **Dispute Resolution**: Add manual review workflow for edge cases
4. **Advanced Attribution**: ML-based contributor scoring for multi-person issues
5. **GraphQL Hybrid**: Use GraphQL for complex queries, REST for events

## Troubleshooting

### Oracle not running

- Check cron schedule in `BountiesService.scheduleMonitoring()`
- Verify `OracleModule` is imported in `AppModule`
- Check logs for startup errors

### Bounties not updating

- Verify GitHub token is set: `echo $GITHUB_TOKEN`
- Check rate limit status: `GET /oracle/status`
- Review Oracle validation logs

### Wrong winner assigned

- Check `processed_event_id` in database
- Verify commit author lookup succeeded
- Review GitHub issue timeline for manual intervention

## Related Files

- **Service**: [`src/oracle/oracle.service.ts`](src/oracle/oracle.service.ts)
- **Controller**: [`src/oracle/oracle.controller.ts`](src/oracle/oracle.controller.ts)
- **Module**: [`src/oracle/oracle.module.ts`](src/oracle/oracle.module.ts)
- **Schema**: [`prisma/schema.prisma`](prisma/schema.prisma)
- **GitHub Service**: [`src/github/github.service.ts`](src/github/github.service.ts)

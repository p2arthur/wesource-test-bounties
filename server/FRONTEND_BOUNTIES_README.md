# Frontend Integration: Bounties

This document describes how the frontend should create bounties and display their status as GitHub issues are closed.

## Endpoint: Create Bounty

`POST /api/bounties`

### Request body

```json
{
  "repoOwner": "octocat",
  "repoName": "hello-world",
  "issueNumber": 123,
  "amount": 250,
  "creatorWallet": "0x1234...abcd"
}
```

### Response

```json
{
  "id": 1,
  "repoOwner": "octocat",
  "repoName": "hello-world",
  "issueNumber": 123,
  "issueId": "MDU6SXNzdWUxMjM0NTY3OA==",
  "amount": 250,
  "creatorWallet": "0x1234...abcd",
  "status": "OPEN",
  "winnerGithubId": null,
  "winnerGithubLogin": null,
  "createdAt": "2026-01-24T12:00:00.000Z",
  "updatedAt": "2026-01-24T12:00:00.000Z"
}
```

## Status Lifecycle

- `OPEN`: The bounty exists and the issue is still open (or has not yet been confirmed closed by a PR).
- `READY_FOR_CLAIM`: The issue was closed by a Pull Request and the winner GitHub ID/login has been captured.
- `CLAIMED`: Reserved for later use when payouts are implemented.

## Monitoring Behavior

A background cron task runs every 15 minutes. When it detects a PR that closed the issue, the bounty is updated to `READY_FOR_CLAIM`, and the `winnerGithubId` / `winnerGithubLogin` fields are filled in.

## Activity Feed

When a bounty is closed by a PR, a new ActivityFeed record is created with a message like:

```
{username} solved {owner}/{repo}#{issueNumber}!
```

If you want to display the Activity Feed in the frontend, add a small API endpoint to expose ActivityFeed records.

## Environment

The backend requires `GITHUB_TOKEN` for the GitHub GraphQL API used by the monitoring cron job. Bounty creation does not require the token and does not validate issue status on write.

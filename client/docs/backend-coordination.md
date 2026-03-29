# Backend Coordination - Frontend Claim Flow

## Required Backend Endpoints

### 1. GET /api/bounties/:id
**Purpose:** Return full bounty details including winner information for claim page.

**Request:** `GET /api/bounties/1`

**Response:**
```json
{
  "id": 1,
  "bountyKey": "...",
  "repoOwner": "octocat",
  "repoName": "hello-world",
  "issueNumber": 123,
  "issueUrl": "https://github.com/octocat/hello-world/issues/123",
  "amount": 10000000,
  "creatorWallet": "0x...",
  "status": "READY_FOR_CLAIM",
  "winnerId": 42,
  "createdAt": "...",
  "updatedAt": "...",
  "winner": {
    "id": 42,
    "username": "winner-gh-user",
    "wallet": "ALGO...ABC"
  }
}
```

### 2. POST /api/bounties/claim
**Purpose:** Allow winner to claim their bounty reward.

**Request:** `POST /api/bounties/claim`
```json
{
  "bountyId": 1
}
```

**Headers:**
- `Authorization: Wallet <address>:<signature>:<message>` (traditional wallets)
- OR HTTP-only cookie (Web3Auth)

**Response:**
```json
{
  "txId": "abc123..."
}
```

**Error Responses:**
- 400: Bounty not ready for claim
- 403: User is not the winner / Wallet not linked
- 404: Bounty not found

### 3. POST /api/bounties/link-wallet
**Purpose:** Link authenticated wallet to GitHub account for bounty claiming.

**Request:** `POST /api/bounties/link-wallet`
```json
{
  "githubUsername": "octocat",
  "githubId": 123456
}
```

**Headers:** Same as claim endpoint

**Response:**
```json
{
  "message": "Wallet linked successfully"
}
```

### 4. POST /auth/login (Web3Auth)
**Purpose:** Accept Web3Auth JWT and set HTTP-only cookie.

**Request:** `POST /auth/login`
```json
{
  "jwt": "web3auth.jwt.token"
}
```

**Response:** 200 OK with user info, sets HTTP-only cookie

### 5. POST /auth/logout
**Purpose:** Clear authentication cookie.

**Response:** 200 OK with cleared cookies

## Implementation Checklist

### Backend Implementation
- [ ] `GET /api/bounties/:id` returns `winner` object with `wallet` field
- [ ] `POST /api/bounties/claim` validates auth headers
  - [ ] For traditional wallets: verify `Authorization: Wallet ...` format
  - [ ] For Web3Auth: verify HTTP-only cookie
  - [ ] Check `bounty.winner.wallet` matches authenticated wallet
- [ ] `POST /api/bounties/link-wallet` links GitHub to wallet
  - [ ] Updates User table with wallet address
  - [ ] Returns success response
- [ ] CORS allows frontend origin
- [ ] HTTP-only cookies work for Web3Auth
- [ ] Ephemeral signature verification works for traditional wallets

### Testing Checklist
- [ ] `GET /api/bounties/:id` returns winner object
- [ ] `POST /api/bounties/claim` validates auth headers
- [ ] `POST /api/bounties/claim` fails if wallet doesn't match winner
- [ ] `POST /api/bounties/link-wallet` links wallet to GitHub user
- [ ] `POST /api/bounties/link-wallet` fails if already linked
- [ ] CORS headers properly configured
- [ ] HTTP-only cookies are secure and set correctly

## Frontend Integration Points

### API Calls
1. **Claim Bounty**
   - Call `POST /api/bounties/claim` with auth headers
   - Handle 401 errors (redirect to login with toast)
   - Handle 403 errors (show "not winner" message)

2. **Wallet Linking**
   - Call `POST /api/bounties/link-wallet` with auth headers
   - Refresh bounty data after linking
   - Show success toast

3. **Bounty Details**
   - Call `GET /api/bounties/:id` for full details
   - Use `winner.wallet` for verification
   - Display `winner.username` for non-winners

### Error Handling
- 401: Show toast "Session expired, please login again" → redirect to login
- 403: Show "You are not the winner of this bounty"
- 404: Show "Bounty not found"

## Security Considerations

### Web3Auth (HTTP-only Cookies)
- Cookies set with `HttpOnly`, `Secure`, `SameSite=Strict`
- JWT verified against Web3Auth JWKS endpoint
- Short expiration (1-24 hours)

### Traditional Wallets
- Messages include timestamp for replay protection
- 5-minute expiry on backend signature verification
- Base64-encoded signatures in header
- Ephemeral storage (not persisted)

### General
- All mutating endpoints protected by AuthGuard
- GET endpoints remain public
- CORS restricts to frontend origin only

## Open Questions

1. **GitHub OAuth**: Should we use Web3Auth GitHub provider or separate OAuth flow?
   - Recommendation: Use Web3Auth GitHub provider for consistency

2. **Testing Environment**: How to test wallet linking without real wallets?
   - Use mock wallets in E2E tests

3. **Production Deployment**: How to handle Web3Auth client ID and JWT verification?
   - Use environment variables for client ID
   - JWKS endpoint from Web3Auth docs

## Deployment Notes

### Required Environment Variables
```bash
# Backend
VITE_WEB3AUTH_CLIENT_ID=<web3auth-client-id>
MANAGER_MNEMONIC=<algorand-manager-wallet-mnemonic>
DATABASE_URL=<postgresql-connection-string>

# Frontend
VITE_API_URL=http://localhost:3000
```

### CORS Configuration
Ensure backend allows:
```
Origin: http://localhost:5173 (development)
Origin: https://wesource.example.com (production)
```

## Timeline

- **Task 1-3 (Auth system)**: Backend implementation required
- **Task 4-5 (useX402Fetch, useAuth)**: Backend implementation required
- **Task 6 (Claim page)**: Backend implementation required
- **Task 7 (Component updates)**: No backend changes
- **Task 8 (E2E tests)**: Backend must be running for tests

## Contact

For questions about backend implementation, reference:
- `server/src/bounties/bounties.controller.ts`
- `server/src/bounties/bounties.service.ts`
- `server/src/auth/` directory

# Frontend Claim Flow Implementation Specification

**Date**: 2026-03-29  
**Author**: Forensic Architect  
**Status**: Approved  
**Scope**: `/client` frontend updates for Phase 4 backend completion

---

## Context

Backend Phase 4 is complete with wallet verification claim flow. The backend now has:
- `POST /api/bounties/claim` - Auth-protected claim endpoint
- `POST /api/bounties/link-wallet` - Wallet linking endpoint  
- `AuthGuard` with `@WalletAddress()` decorator
- Proper winner wallet verification

Frontend needs corresponding updates to enable winners to claim bounties.

---

## Requirements

### Core Tasks:
1. **Update claim button logic** - Only show for `READY_FOR_CLAIM` status when `activeAddress === bounty.winner?.wallet`
2. **Implement auth headers** - `Bearer` (Web3Auth JWT cookie) or `Wallet` (traditional wallet signature) format based on `walletType`
3. **Add wallet linking** - Call `POST /api/bounties/link-wallet` when winner has no wallet
4. **Update useX402Fetch** - Include auth headers for authenticated requests
5. **MicroAlgos display** - Convert microAlgos → ALGO by dividing by 1,000,000 everywhere

---

## Architecture

### Authentication System

#### Web3Auth (Social Login)
```
Frontend (Web3Auth SDK) → JWT → Backend /auth/login → HTTP-only Cookie → API calls
```
- **Secure**: HTTP-only cookies prevent XSS token theft
- **Automatic**: Cookies sent with all requests, no manual headers
- **Endpoints**: Need `POST /auth/login` and `POST /auth/logout`

#### Traditional Wallets (Pera/Defly/Exodus)
```
Frontend signLoginMessage() → signature → Authorization: Wallet <address>:<signature>:<message>
```
- **Ephemeral**: Signatures generated per session, not persisted
- **Message**: `"WeSource login: {timestamp}"` (5-minute expiry)
- **Storage**: In-memory only, cleared on logout

### API Layer Updates

#### New Endpoints Needed:
1. `GET /api/bounties/:id` - Full bounty with winner details (for detail pages)
2. `POST /auth/login` - Web3Auth JWT → HTTP-only cookie  
3. `POST /auth/logout` - Clear auth cookie

#### Updated API Functions:
- `getBountyById(id: number, headers?: HeadersInit)` - Fetch full bounty
- `claimBounty(bountyId: number, headers?: HeadersInit)` - Claim endpoint
- `linkWallet(githubUsername: string, githubId: number, headers?: HeadersInit)` - Link wallet

---

## Implementation Details

### 1. Auth Headers Utility (`src/utils/auth.ts`)

```typescript
export async function getAuthHeaders(
  walletType: 'web3auth' | 'traditional' | null,
  activeAddress: string | null,
  signMessage?: () => Promise<{ signature: string; message: string }>
): Promise<HeadersInit> {
  if (!walletType || !activeAddress) return {};
  
  if (walletType === 'web3auth') {
    // Cookies sent automatically via browser
    return {};
  } else {
    // Traditional wallet: sign message
    if (!signMessage) {
      throw new Error('signMessage function required for traditional wallets');
    }
    const { signature, message } = await signMessage();
    return { 
      'Authorization': `Wallet ${activeAddress}:${signature}:${message}`
    };
  }
}
```

### 2. Updated `useUnifiedWallet` Hook (`src/hooks/useUnifiedWallet.ts`)

Add message signing capability:

```typescript
// Add to return object
const signLoginMessage = async (): Promise<{ signature: string; message: string }> => {
  if (walletType === 'web3auth') {
    throw new Error('Web3Auth users use JWT cookies, not message signing');
  }
  
  const timestamp = Date.now();
  const message = `WeSource login: ${timestamp}`;
  const encoder = new TextEncoder();
  const messageBytes = encoder.encode(message);
  
  // Check @txnlab/use-wallet API for correct signing method
  // Options: signBytes(), signTransaction(), or create transaction to sign
  const signature = await traditional.signBytes?.(messageBytes) 
    ?? await traditional.signTransaction?.(messageToSignTx(messageBytes));
  return { 
    signature: Buffer.from(signature).toString('base64'), 
    message 
  };
};
```

### 3. Bounty Type Updates (`src/interfaces/entities.ts`)

```typescript
export interface Bounty {
  id: number;
  bountyKey: string;
  repoOwner: string;
  repoName: string;
  issueNumber: number;
  issueUrl: string;
  amount: number; // microAlgos
  creatorWallet: string;
  status: string;
  winnerId: number | null;
  createdAt: string;
  updatedAt: string;
  projectName?: string;
  winner?: {
    id: number;
    username?: string;
    wallet?: string;
  };
}
```

### 4. MicroAlgos Conversion Utilities (`src/utils/amount.ts`)

```typescript
export function microAlgosToAlgo(microAlgos: number): number {
  return microAlgos / 1_000_000;
}

export function formatAlgoAmount(microAlgos: number): string {
  const algo = microAlgosToAlgo(microAlgos);
  return `${algo.toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 6 
  })} ALGO`;
}

export function algoToMicroAlgo(algo: number): number {
  return Math.round(algo * 1_000_000);
}
```

### 5. Updated `useX402Fetch` Hook (`src/hooks/useX402Fetch.ts`)

```typescript
export function useX402Fetch(authHeaders?: HeadersInit): typeof fetch {
  // ... existing hook logic ...
  
  // In useMemo return:
  const wrappedFetch = wrapFetchWithPayment(fetch, client);
  
  return (input: RequestInfo | URL, init?: RequestInit) => {
    const mergedInit = {
      ...init,
      headers: {
        ...authHeaders,
        ...init?.headers,
      },
      credentials: walletType === 'web3auth' ? 'include' : 'omit',
    };
    
    return wrappedFetch(input, mergedInit);
  };
}
```

### 6. BountyPage Claim Button Logic (`src/pages/BountyPage.tsx`)

Replace current logic (lines 223-241):

```tsx
{/* Current (incorrect) */}
{isOpen && isConnected ? <button>Claim Bounty</button> : ...}

{/* Updated (correct) */}
{bounty.status === 'READY_FOR_CLAIM' && isConnected && activeAddress === bounty.winner?.wallet ? (
  <button onClick={handleClaim} className="...">
    Claim Bounty — {formatAlgoAmount(bounty.amount)}
  </button>
) : bounty.status === 'READY_FOR_CLAIM' && bounty.winner && !bounty.winner.wallet ? (
  <button onClick={handleLinkWallet} className="...">
    Link Wallet to Claim {formatAlgoAmount(bounty.amount)}
  </button>
) : bounty.status === 'READY_FOR_CLAIM' && isConnected && activeAddress !== bounty.winner?.wallet ? (
  <div className="text-gray-500">
    This bounty has been awarded to {bounty.winner?.username}
  </div>
) : bounty.status === 'OPEN' ? (
  <div className="text-gray-500">
    Solve this issue on GitHub to win this bounty
  </div>
) : bounty.status === 'CLAIMED' ? (
  <div className="text-green-600">
    ✓ This bounty has been claimed
  </div>
) : null}
```

### 7. Wallet Linking Flow

When `bounty.winner?.wallet` is missing:
1. Show "Link Wallet to Claim" button
2. On click: Open GitHub OAuth modal
3. Get GitHub username and ID
4. Call `POST /api/bounties/link-wallet` with auth headers
5. Refresh bounty data (call `GET /api/bounties/:id`)
6. Show claim button if wallet now linked

### 8. Error Handling

```typescript
// Global error interceptor
const handleApiError = (error: any) => {
  if (error.response?.status === 401) {
    showToast('Session expired, please login again', 'error');
    setTimeout(() => navigate('/login'), 2000);
  }
  throw error;
};

// In API calls
try {
  const response = await fetch(url, { ...init, headers: authHeaders });
  if (!response.ok) {
    if (response.status === 401) {
      handleApiError({ response });
    }
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
} catch (error) {
  handleApiError(error);
}
```

---

## Testing Requirements

### Unit Tests:
1. `microAlgosToAlgo()` conversion
2. `getAuthHeaders()` returns correct format
3. `signLoginMessage()` produces valid signature

### Integration Tests:
1. Web3Auth user → API call with cookies
2. Traditional wallet → API call with Wallet header  
3. Claim flow: READY_FOR_CLAIM + winner wallet → success
4. Claim flow: wrong wallet → 403 error
5. Wallet linking → claim enabled

### E2E Tests:
1. Full bounty lifecycle: create → solve → claim
2. Web3Auth vs traditional wallet flows
3. Error scenarios (401, 403, 404)

---

## Security Considerations

### Web3Auth:
- HTTP-only cookies prevent XSS token theft
- JWT verification on backend with Web3Auth JWKS
- Short expiration (1-24 hours)

### Traditional Wallets:
- Ephemeral signatures (not persisted)
- Message includes timestamp for replay protection
- 5-minute expiry on backend

### General:
- No sensitive data in localStorage
- Secure cookie attributes (HttpOnly, Secure, SameSite)
- CORS configured for frontend origin only

---

## Dependencies

### Backend Dependencies:
- [ ] `POST /auth/login` endpoint for Web3Auth JWT cookies
- [ ] `POST /auth/logout` endpoint
- [ ] `GET /api/bounties/:id` endpoint with winner details
- [ ] CORS configured for frontend origin

### Frontend Dependencies:
- [ ] Web3Auth SDK configured ✓ (already installed)
- [ ] `@txnlab/use-wallet-react` for traditional wallets ✓ (already installed)
- [ ] Toast notification library ✓ (`notistack` already installed and used)
- [ ] GitHub OAuth client (for wallet linking) ✓ (Web3Auth GitHub provider)

---

## Rollout Plan

### Phase 1: Auth Foundation (Day 1)
1. Create auth utility and update `useUnifiedWallet`
2. Add Web3Auth cookie endpoints (coordinate with backend)
3. Test auth flows in isolation

### Phase 2: API Updates (Day 2)  
1. Update `api.ts` with new functions
2. Update `useX402Fetch` to accept auth headers
3. Add error handling and toasts

### Phase 3: Bounty Page (Day 3)
1. Update Bounty type with winner field
2. Implement `GET /api/bounties/:id` call
3. Fix claim button logic
4. Add microAlgos conversion

### Phase 4: Wallet Linking (Day 4)
1. Add wallet linking UI
2. Implement GitHub OAuth flow
3. Test full claim flow

### Phase 5: Testing & Polish (Day 5)
1. Write unit and integration tests
2. Fix any bugs found
3. Update documentation

---

## Success Criteria

- [ ] Winner can claim READY_FOR_CLAIM bounty with matching wallet
- [ ] Winner without wallet can link via GitHub OAuth
- [ ] Wrong wallet gets 403 error with clear message
- [ ] OPEN bounties don't show claim button
- [ ] All amounts displayed as ALGO (not microAlgos)
- [ ] Auth errors (401) trigger re-login flow
- [ ] Web3Auth and traditional wallets both work
- [ ] x402 payments still work with auth headers

---

## Open Questions

1. **GitHub OAuth flow**: Should we use existing `useUnifiedWallet` Web3Auth flow or separate OAuth? *Recommendation: Reuse Web3Auth GitHub provider for consistency.*
2. **Toast library**: `notistack` already installed and used in codebase. Use `useSnackbar()` hook.
3. **Error boundaries**: Should we add React error boundaries for auth failures? *Optional for Phase 1.*
4. **Loading states**: Need loading spinners during wallet linking and claim.

---

## Notes

- **Performance**: Auth headers add minimal overhead
- **Backward compatibility**: Old bounties without winner.wallet need graceful handling
- **Mobile**: Traditional wallet headers work on mobile wallets
- **Logging**: Add debug logging for auth flow troubleshooting

---

*Spec approved and ready for implementation.*
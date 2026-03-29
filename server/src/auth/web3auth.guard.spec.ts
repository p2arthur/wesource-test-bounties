import { ExecutionContext } from '@nestjs/common';

// Mock jose before importing the guard so the module-level JWKS init is intercepted
const mockJwtVerify = jest.fn();
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => 'mock-jwks'),
  jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
}));

import { Web3AuthGuard } from './web3auth.guard';

function makeCtxWithReqRef(authHeader?: string): { ctx: ExecutionContext; req: Record<string, unknown> } {
  const req: Record<string, unknown> = { headers: authHeader ? { authorization: authHeader } : {} };
  const ctx = { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
  return { ctx, req };
}

const ALGORAND_ADDRESS = 'VCMJKWOY5P5JF7KBSQKF5EFLW5BGSQ3DGY5FEQ5DXNVQGHPXQKQJVZLQ';

describe('Web3AuthGuard', () => {
  let guard: Web3AuthGuard;

  beforeEach(() => {
    guard = new Web3AuthGuard();
    mockJwtVerify.mockReset();
  });

  describe('header format', () => {
    it('returns false when Authorization header is absent', async () => {
      const { ctx } = makeCtxWithReqRef();
      expect(await guard.canActivate(ctx)).toBe(false);
      expect(mockJwtVerify).not.toHaveBeenCalled();
    });

    it('returns false when header uses Wallet prefix', async () => {
      const { ctx } = makeCtxWithReqRef('Wallet addr:sig:msg');
      expect(await guard.canActivate(ctx)).toBe(false);
      expect(mockJwtVerify).not.toHaveBeenCalled();
    });
  });

  describe('JWT verification failures', () => {
    it('returns false when jwtVerify throws (expired token)', async () => {
      mockJwtVerify.mockRejectedValue(new Error('JWTExpired'));
      const { ctx } = makeCtxWithReqRef('Bearer expired.jwt.token');
      expect(await guard.canActivate(ctx)).toBe(false);
    });

    it('returns false when jwtVerify throws (invalid signature)', async () => {
      mockJwtVerify.mockRejectedValue(new Error('JWSInvalid'));
      const { ctx } = makeCtxWithReqRef('Bearer bad.jwt.token');
      expect(await guard.canActivate(ctx)).toBe(false);
    });
  });

  describe('wallet extraction from payload', () => {
    it('returns false when payload has no wallets claim', async () => {
      mockJwtVerify.mockResolvedValue({ payload: {} });
      const { ctx } = makeCtxWithReqRef('Bearer valid.jwt.token');
      expect(await guard.canActivate(ctx)).toBe(false);
    });

    it('returns false when wallets array is empty', async () => {
      mockJwtVerify.mockResolvedValue({ payload: { wallets: [] } });
      const { ctx } = makeCtxWithReqRef('Bearer valid.jwt.token');
      expect(await guard.canActivate(ctx)).toBe(false);
    });

    it('returns false when wallet entry has no address', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: { wallets: [{ blockchain: 'algorand', address: '' }] },
      });
      const { ctx } = makeCtxWithReqRef('Bearer valid.jwt.token');
      expect(await guard.canActivate(ctx)).toBe(false);
    });
  });

  describe('happy path', () => {
    it('returns true and attaches walletAddress from algorand wallet entry', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: {
          wallets: [{ blockchain: 'algorand', address: ALGORAND_ADDRESS }],
        },
      });
      const { ctx, req } = makeCtxWithReqRef('Bearer valid.jwt.token');

      expect(await guard.canActivate(ctx)).toBe(true);
      expect(req.walletAddress).toBe(ALGORAND_ADDRESS);
    });

    it('prefers algorand wallet when multiple blockchains present', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: {
          wallets: [
            { blockchain: 'ethereum', address: '0xDeadBeef' },
            { blockchain: 'algorand', address: ALGORAND_ADDRESS },
          ],
        },
      });
      const { ctx, req } = makeCtxWithReqRef('Bearer valid.jwt.token');

      expect(await guard.canActivate(ctx)).toBe(true);
      expect(req.walletAddress).toBe(ALGORAND_ADDRESS);
    });

    it('falls back to first wallet entry when no algorand entry', async () => {
      const fallbackAddress = '0xSomeOtherAddress';
      mockJwtVerify.mockResolvedValue({
        payload: {
          wallets: [{ blockchain: 'ethereum', address: fallbackAddress }],
        },
      });
      const { ctx, req } = makeCtxWithReqRef('Bearer valid.jwt.token');

      expect(await guard.canActivate(ctx)).toBe(true);
      expect(req.walletAddress).toBe(fallbackAddress);
    });

    it('passes the token to jwtVerify (not the full header)', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: { wallets: [{ blockchain: 'algorand', address: ALGORAND_ADDRESS }] },
      });
      const { ctx } = makeCtxWithReqRef('Bearer my.actual.token');

      await guard.canActivate(ctx);

      expect(mockJwtVerify).toHaveBeenCalledWith('my.actual.token', 'mock-jwks', expect.any(Object));
    });
  });
});

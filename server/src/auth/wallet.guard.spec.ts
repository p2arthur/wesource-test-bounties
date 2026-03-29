import { ExecutionContext } from '@nestjs/common';
import algosdk from 'algosdk';
import { WalletGuard } from './wallet.guard';

function makeCtx(authHeader: string): ExecutionContext {
  const req: Record<string, unknown> = { headers: { authorization: authHeader } };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function makeCtxWithReqRef(authHeader: string): { ctx: ExecutionContext; req: Record<string, unknown> } {
  const req: Record<string, unknown> = { headers: { authorization: authHeader } };
  const ctx = { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
  return { ctx, req };
}

function sign(message: string, sk: Uint8Array): string {
  return Buffer.from(algosdk.signBytes(Buffer.from(message), sk)).toString('base64');
}

describe('WalletGuard', () => {
  let guard: WalletGuard;
  let account: algosdk.Account;

  beforeAll(() => {
    guard = new WalletGuard();
    account = algosdk.generateAccount();
  });

  describe('header format validation', () => {
    it('returns false when header is missing', () => {
      const req: Record<string, unknown> = { headers: {} };
      const ctx = { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
      expect(guard.canActivate(ctx)).toBe(false);
    });

    it('returns false when header uses Bearer prefix', () => {
      expect(guard.canActivate(makeCtx('Bearer sometoken'))).toBe(false);
    });

    it('returns false when header has no colons after prefix', () => {
      expect(guard.canActivate(makeCtx('Wallet nocolonsatall'))).toBe(false);
    });

    it('returns false when header has only one colon', () => {
      expect(guard.canActivate(makeCtx('Wallet addr:sigonly'))).toBe(false);
    });
  });

  describe('message format validation', () => {
    it('returns false when message does not start with WeSource login:', () => {
      const msg = `Login: ${Date.now()}`;
      const sig = sign(msg, account.sk);
      expect(guard.canActivate(makeCtx(`Wallet ${account.addr}:${sig}:${msg}`))).toBe(false);
    });

    it('returns false when timestamp is not a number', () => {
      const msg = 'WeSource login: notanumber';
      const sig = sign(msg, account.sk);
      expect(guard.canActivate(makeCtx(`Wallet ${account.addr}:${sig}:${msg}`))).toBe(false);
    });
  });

  describe('replay attack prevention', () => {
    it('returns false for message older than 5 minutes', () => {
      const msg = `WeSource login: ${Date.now() - 6 * 60 * 1000}`;
      const sig = sign(msg, account.sk);
      expect(guard.canActivate(makeCtx(`Wallet ${account.addr}:${sig}:${msg}`))).toBe(false);
    });

    it('returns false for message exactly at the 5-minute boundary', () => {
      const msg = `WeSource login: ${Date.now() - 5 * 60 * 1000 - 1}`;
      const sig = sign(msg, account.sk);
      expect(guard.canActivate(makeCtx(`Wallet ${account.addr}:${sig}:${msg}`))).toBe(false);
    });

    it('accepts message just within 5-minute window', () => {
      const msg = `WeSource login: ${Date.now() - 4 * 60 * 1000}`;
      const sig = sign(msg, account.sk);
      const { ctx } = makeCtxWithReqRef(`Wallet ${account.addr}:${sig}:${msg}`);
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('signature verification', () => {
    it('returns false for tampered signature (all zeros)', () => {
      const msg = `WeSource login: ${Date.now()}`;
      const badSig = Buffer.alloc(64).toString('base64');
      expect(guard.canActivate(makeCtx(`Wallet ${account.addr}:${badSig}:${msg}`))).toBe(false);
    });

    it('returns false when signature is from a different account', () => {
      const other = algosdk.generateAccount();
      const msg = `WeSource login: ${Date.now()}`;
      const sig = sign(msg, other.sk); // signed by other, claimed as account
      expect(guard.canActivate(makeCtx(`Wallet ${account.addr}:${sig}:${msg}`))).toBe(false);
    });

    it('returns false when message was tampered after signing', () => {
      const msg = `WeSource login: ${Date.now()}`;
      const sig = sign(msg, account.sk);
      const tamperedMsg = `WeSource login: ${Date.now() + 1}`; // different timestamp
      expect(guard.canActivate(makeCtx(`Wallet ${account.addr}:${sig}:${tamperedMsg}`))).toBe(false);
    });

    it('returns false for invalid base64 signature', () => {
      const msg = `WeSource login: ${Date.now()}`;
      expect(guard.canActivate(makeCtx(`Wallet ${account.addr}:!!!notbase64!!!:${msg}`))).toBe(false);
    });
  });

  describe('happy path', () => {
    it('returns true and attaches walletAddress for valid signature', () => {
      const msg = `WeSource login: ${Date.now()}`;
      const sig = sign(msg, account.sk);
      const { ctx, req } = makeCtxWithReqRef(`Wallet ${account.addr}:${sig}:${msg}`);

      expect(guard.canActivate(ctx)).toBe(true);
      expect(req.walletAddress).toBe(account.addr.toString());
    });

    it('works for a freshly generated account', () => {
      const fresh = algosdk.generateAccount();
      const msg = `WeSource login: ${Date.now()}`;
      const sig = sign(msg, fresh.sk);
      const { ctx, req } = makeCtxWithReqRef(`Wallet ${fresh.addr}:${sig}:${msg}`);

      expect(guard.canActivate(ctx)).toBe(true);
      expect(req.walletAddress).toBe(fresh.addr.toString());
    });
  });
});

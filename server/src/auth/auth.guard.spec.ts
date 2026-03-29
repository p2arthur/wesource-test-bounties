import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { Web3AuthGuard } from './web3auth.guard';
import { WalletGuard } from './wallet.guard';

function makeCtx(authHeader?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: authHeader ? { authorization: authHeader } : {} }),
    }),
  } as unknown as ExecutionContext;
}

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let web3Auth: jest.Mocked<Pick<Web3AuthGuard, 'canActivate'>>;
  let walletGuard: jest.Mocked<Pick<WalletGuard, 'canActivate'>>;

  beforeEach(() => {
    web3Auth = { canActivate: jest.fn() };
    walletGuard = { canActivate: jest.fn() };
    guard = new AuthGuard(
      web3Auth as unknown as Web3AuthGuard,
      walletGuard as unknown as WalletGuard,
    );
  });

  describe('missing / unrecognised header', () => {
    it('throws 401 when Authorization header is absent', async () => {
      await expect(guard.canActivate(makeCtx())).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(makeCtx())).rejects.toThrow('Authorization header required');
    });

    it('throws 401 for unknown prefix (Token, Basic, etc.)', async () => {
      await expect(guard.canActivate(makeCtx('Token abc123'))).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(makeCtx('Basic dXNlcjpwYXNz'))).rejects.toThrow(UnauthorizedException);
    });

    it('does not call either sub-guard when header is absent', async () => {
      await guard.canActivate(makeCtx()).catch(() => {});
      expect(web3Auth.canActivate).not.toHaveBeenCalled();
      expect(walletGuard.canActivate).not.toHaveBeenCalled();
    });
  });

  describe('Bearer path (Web3Auth)', () => {
    it('delegates to Web3AuthGuard', async () => {
      web3Auth.canActivate.mockResolvedValue(true);
      await guard.canActivate(makeCtx('Bearer some.jwt.token'));
      expect(web3Auth.canActivate).toHaveBeenCalledTimes(1);
      expect(walletGuard.canActivate).not.toHaveBeenCalled();
    });

    it('returns true when Web3AuthGuard accepts', async () => {
      web3Auth.canActivate.mockResolvedValue(true);
      await expect(guard.canActivate(makeCtx('Bearer valid'))).resolves.toBe(true);
    });

    it('throws 401 when Web3AuthGuard rejects', async () => {
      web3Auth.canActivate.mockResolvedValue(false);
      await expect(guard.canActivate(makeCtx('Bearer bad'))).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(makeCtx('Bearer bad'))).rejects.toThrow('Web3Auth');
    });
  });

  describe('Wallet path (signature)', () => {
    it('delegates to WalletGuard', async () => {
      walletGuard.canActivate.mockReturnValue(true);
      await guard.canActivate(makeCtx('Wallet addr:sig:msg'));
      expect(walletGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(web3Auth.canActivate).not.toHaveBeenCalled();
    });

    it('returns true when WalletGuard accepts', async () => {
      walletGuard.canActivate.mockReturnValue(true);
      await expect(guard.canActivate(makeCtx('Wallet addr:sig:msg'))).resolves.toBe(true);
    });

    it('throws 401 when WalletGuard rejects', async () => {
      walletGuard.canActivate.mockReturnValue(false);
      await expect(guard.canActivate(makeCtx('Wallet bad:sig:msg'))).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(makeCtx('Wallet bad:sig:msg'))).rejects.toThrow('wallet signature');
    });
  });

  describe('sub-guard isolation', () => {
    it('does not call WalletGuard for Bearer headers', async () => {
      web3Auth.canActivate.mockResolvedValue(true);
      await guard.canActivate(makeCtx('Bearer token'));
      expect(walletGuard.canActivate).not.toHaveBeenCalled();
    });

    it('does not call Web3AuthGuard for Wallet headers', async () => {
      walletGuard.canActivate.mockReturnValue(true);
      await guard.canActivate(makeCtx('Wallet addr:sig:msg'));
      expect(web3Auth.canActivate).not.toHaveBeenCalled();
    });
  });
});

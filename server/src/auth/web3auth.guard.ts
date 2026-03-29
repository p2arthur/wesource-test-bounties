import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const WEB3AUTH_JWKS_URL = new URL('https://api-auth.web3auth.io/v1/jwks');
const WEB3AUTH_ISSUER = 'https://api.openlogin.com';

// Lazily initialized to avoid network calls at module load time
let jwks: ReturnType<typeof createRemoteJWKSet>;
function getJwks() {
  if (!jwks) jwks = createRemoteJWKSet(WEB3AUTH_JWKS_URL);
  return jwks;
}

interface Web3AuthWallet {
  blockchain: string;
  address: string;
  public_key: string;
}

@Injectable()
export class Web3AuthGuard implements CanActivate {
  private readonly logger = new Logger(Web3AuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string>; walletAddress?: string }>();
    const authHeader = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) return false;

    const token = authHeader.slice(7);

    try {
      const { payload } = await jwtVerify(token, getJwks(), {
        issuer: WEB3AUTH_ISSUER,
      });

      const wallets = (payload as { wallets?: Web3AuthWallet[] }).wallets;
      const algorandWallet = wallets?.find((w) => w.blockchain === 'algorand') ?? wallets?.[0];

      if (!algorandWallet?.address) {
        this.logger.warn('Web3Auth JWT has no Algorand wallet address');
        return false;
      }

      request.walletAddress = algorandWallet.address;
      return true;
    } catch (err) {
      this.logger.debug(`Web3Auth JWT verification failed: ${(err as Error).message}`);
      return false;
    }
  }
}

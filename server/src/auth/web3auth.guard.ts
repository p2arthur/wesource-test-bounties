import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { PrismaService } from '../prisma/prisma.service';

const WEB3AUTH_JWKS_URL = new URL('https://api-auth.web3auth.io/jwks');

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

interface Web3AuthPayload {
  wallets?: Web3AuthWallet[];
  verifierId?: string;
  sub?: string;
}

@Injectable()
export class Web3AuthGuard implements CanActivate {
  private readonly logger = new Logger(Web3AuthGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string>; walletAddress?: string }>();
    const authHeader = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) return false;

    const token = authHeader.slice(7);

    try {
      const { payload } = await jwtVerify(token, getJwks());
      const web3Payload = payload as Web3AuthPayload;

      // Try wallets array first (populated for native chain providers)
      const wallets = web3Payload.wallets;
      const algorandWallet = wallets?.find((w) => w.blockchain === 'algorand') ?? wallets?.[0];

      if (algorandWallet?.address) {
        request.walletAddress = algorandWallet.address;
        return true;
      }

      // Fallback: CommonPrivateKeyProvider (Algorand) doesn't populate wallets in the JWT.
      // Look up the wallet from our DB using verifierId (= GitHub user ID stored at login).
      // verifierId format: "github|84791111" — strip the prefix before parsing.
      const rawVerifierId = web3Payload.verifierId ?? web3Payload.sub;
      if (rawVerifierId) {
        const numericPart = rawVerifierId.includes('|') ? rawVerifierId.split('|').pop() : rawVerifierId;
        const githubId = parseInt(numericPart ?? '', 10);
        if (!isNaN(githubId)) {
          const user = await this.prisma.user.findUnique({ where: { githubId } });
          if (user?.wallet) {
            request.walletAddress = user.wallet;
            return true;
          }
        }
      }

      this.logger.warn('Web3Auth JWT verified but no wallet address could be resolved');
      return false;
    } catch (err) {
      this.logger.debug(`Web3Auth JWT verification failed: ${(err as Error).message}`);
      return false;
    }
  }
}

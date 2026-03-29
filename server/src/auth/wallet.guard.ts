import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import algosdk from 'algosdk';

const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes — replay attack prevention
const MESSAGE_PREFIX = 'WeSource login: ';

@Injectable()
export class WalletGuard implements CanActivate {
  private readonly logger = new Logger(WalletGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string>; walletAddress?: string }>();
    const authHeader = request.headers['authorization'];

    if (!authHeader?.startsWith('Wallet ')) return false;

    // Format: Wallet <address>:<base64-signature>:<message>
    const payload = authHeader.slice(7);
    const firstColon = payload.indexOf(':');
    const secondColon = payload.indexOf(':', firstColon + 1);
    if (firstColon === -1 || secondColon === -1) return false;

    const address = payload.slice(0, firstColon);
    const signatureB64 = payload.slice(firstColon + 1, secondColon);
    const message = payload.slice(secondColon + 1);

    // Validate message format and extract timestamp
    if (!message.startsWith(MESSAGE_PREFIX)) return false;
    const timestampStr = message.slice(MESSAGE_PREFIX.length);
    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) return false;

    // Reject messages older than 5 minutes
    if (Date.now() - timestamp > MAX_AGE_MS) {
      this.logger.debug(`Wallet auth rejected: message too old (${Date.now() - timestamp}ms)`);
      return false;
    }

    try {
      const messageBytes = Buffer.from(message);
      const signatureBytes = Buffer.from(signatureB64, 'base64');
      const isValid = algosdk.verifyBytes(messageBytes, signatureBytes, address);
      if (!isValid) return false;

      request.walletAddress = address;
      return true;
    } catch (err) {
      this.logger.debug(`Wallet signature verification failed: ${(err as Error).message}`);
      return false;
    }
  }
}

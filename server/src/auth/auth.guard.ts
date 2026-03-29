import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Web3AuthGuard } from './web3auth.guard';
import { WalletGuard } from './wallet.guard';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly web3AuthGuard: Web3AuthGuard,
    private readonly walletGuard: WalletGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string> }>();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header required');
    }

    if (authHeader.startsWith('Bearer ')) {
      const ok = await this.web3AuthGuard.canActivate(context);
      if (!ok) throw new UnauthorizedException('Invalid or expired Web3Auth token');
      return true;
    }

    if (authHeader.startsWith('Wallet ')) {
      const ok = this.walletGuard.canActivate(context);
      if (!ok) throw new UnauthorizedException('Invalid wallet signature or expired message');
      return true;
    }

    throw new UnauthorizedException('Authorization header must start with "Bearer " or "Wallet "');
  }
}

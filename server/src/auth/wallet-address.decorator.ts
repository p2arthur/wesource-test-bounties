import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const WalletAddress = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<{ walletAddress: string }>();
  return request.walletAddress;
});

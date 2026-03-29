import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { Web3AuthGuard } from './web3auth.guard';
import { WalletGuard } from './wallet.guard';

@Global()
@Module({
  providers: [AuthService, AuthGuard, Web3AuthGuard, WalletGuard],
  exports: [AuthService, AuthGuard, Web3AuthGuard, WalletGuard],
})
export class AuthModule {}

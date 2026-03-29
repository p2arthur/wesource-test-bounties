import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { Web3AuthGuard } from './web3auth.guard';
import { WalletGuard } from './wallet.guard';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, Web3AuthGuard, WalletGuard],
  exports: [AuthService, AuthGuard, Web3AuthGuard, WalletGuard],
})
export class AuthModule {}

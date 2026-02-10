import { Module, Global } from '@nestjs/common';
import { AlgorandService } from './algorand.service';

@Global()
@Module({
  providers: [AlgorandService],
  exports: [AlgorandService],
})
export class AlgorandModule {}

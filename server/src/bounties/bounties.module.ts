import { Module } from '@nestjs/common';
import { BountiesController } from './bounties.controller';
import { BountiesService } from './bounties.service';
import { GithubModule } from '../github/github.module';
import { AlgorandModule } from '../algorand/algorand.module';
import { OracleModule } from '../oracle/oracle.module';

@Module({
  imports: [GithubModule, AlgorandModule, OracleModule],
  controllers: [BountiesController],
  providers: [BountiesService],
})
export class BountiesModule {}

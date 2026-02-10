import { Module } from '@nestjs/common';
import { BountiesController } from './bounties.controller';
import { BountiesService } from './bounties.service';
import { GithubModule } from '../github/github.module';
import { AlgorandModule } from '../algorand/algorand.module';

@Module({
  imports: [GithubModule, AlgorandModule],
  controllers: [BountiesController],
  providers: [BountiesService],
})
export class BountiesModule {}

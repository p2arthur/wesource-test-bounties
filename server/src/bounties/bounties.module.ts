import { Module } from '@nestjs/common';
import { BountiesController } from './bounties.controller';
import { BountiesService } from './bounties.service';
import { GithubModule } from '../github/github.module';

@Module({
  imports: [GithubModule],
  controllers: [BountiesController],
  providers: [BountiesService],
})
export class BountiesModule {}

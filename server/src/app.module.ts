import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { GithubModule } from './github/github.module';
import { ProjectsModule } from './projects/projects.module';
import { BountiesModule } from './bounties/bounties.module';

@Module({
  imports: [PrismaModule, GithubModule, ProjectsModule, BountiesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

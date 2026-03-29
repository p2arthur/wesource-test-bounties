import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { GithubModule } from './github/github.module';
import { ProjectsModule } from './projects/projects.module';
import { BountiesModule } from './bounties/bounties.module';
import { AlgorandModule } from './algorand/algorand.module';
import { SeedModule } from './seed/seed.module';
import { OracleModule } from './oracle/oracle.module';
import { AuthModule } from './auth/auth.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    GithubModule,
    ProjectsModule,
    BountiesModule,
    AlgorandModule,
    SeedModule,
    OracleModule,
    NotificationsModule,
    TransactionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

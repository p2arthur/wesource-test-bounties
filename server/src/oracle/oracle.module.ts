import { Module } from '@nestjs/common';
import { OracleService } from './oracle.service';
import { OracleController } from './oracle.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GithubModule } from '../github/github.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, GithubModule, NotificationsModule],
  controllers: [OracleController],
  providers: [OracleService],
  exports: [OracleService],
})
export class OracleModule {}

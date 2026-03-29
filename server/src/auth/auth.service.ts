import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async linkIdentity(wallet: string, githubUsername: string, githubId: number) {
    return this.prisma.user.upsert({
      where: { githubId },
      update: { wallet, username: githubUsername },
      create: { wallet, username: githubUsername, githubId },
    });
  }
}

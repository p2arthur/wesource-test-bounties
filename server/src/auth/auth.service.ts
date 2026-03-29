import { Injectable, NotFoundException } from '@nestjs/common';
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

  async getUserProfile(walletAddress: string) {
    const user = await this.prisma.user.findFirst({
      where: { wallet: walletAddress },
      include: {
        wonBounties: {
          select: { id: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with wallet ${walletAddress} not found`);
    }

    const bountiesCreated = await this.prisma.bounty.count({
      where: { creatorWallet: walletAddress },
    });

    return {
      username: user.username,
      wallet: user.wallet,
      bountiesCreated,
      bountiesWon: user.wonBounties.length,
      joinedAt: user.createdAt,
    };
  }
}

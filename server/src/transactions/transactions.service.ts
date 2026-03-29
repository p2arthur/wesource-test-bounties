import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(walletAddress: string, type: TransactionType, bountyId: number, amount: number) {
    return this.prisma.transaction.create({
      data: {
        walletAddress,
        type,
        bountyId,
        amount,
      },
    });
  }

  async findByWallet(walletAddress: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { walletAddress },
        include: {
          bounty: {
            select: {
              id: true,
              issueNumber: true,
              issueUrl: true,
              repository: {
                select: {
                  githubUrl: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where: { walletAddress } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: transactions,
      total,
      page,
      limit,
      totalPages,
    };
  }
}

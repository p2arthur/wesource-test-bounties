import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import cron from 'node-cron';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { GithubService } from '../github/github.service';
import { CreateBountyDto } from './dto';

@Injectable()
export class BountiesService implements OnModuleInit {
  private readonly logger = new Logger(BountiesService.name);
  private readonly checkDelayMs = 350;
  private monitorInProgress = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly githubService: GithubService,
  ) {}

  onModuleInit() {
    this.scheduleMonitoring();
    void this.runStartupCheck();
  }

  private async runStartupCheck() {
    this.logger.log('Running bounty status check on startup...');
    await this.monitorOpenBounties();
  }

  async create(createBountyDto: CreateBountyDto) {
    const { repoOwner, repoName, issueNumber, amount, creatorWallet } =
      createBountyDto;

    const repoPath = `${repoOwner}/${repoName}`;
    const bountyKey = this.buildBountyKey(repoOwner, repoName, issueNumber);
    const repository = await this.prisma.repository.findFirst({
      where: {
        githubUrl: {
          contains: repoPath,
        },
      },
    });

    if (!repository) {
      throw new HttpException(
        `Repository ${repoPath} not found. Create a project with this repository first.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const issueUrl = `https://github.com/${repoOwner}/${repoName}/issues/${issueNumber}`;

    const bounty = await this.prisma.bounty.create({
      data: {
        issueNumber: issueNumber,
        bountyKey,
        issueUrl,
        amount,
        creatorWallet,
        status: 'OPEN',
        repositoryId: repository.id,
        githubIssueId: BigInt(0),
      },
    });

    return {
      id: bounty.id,
      bountyKey: bounty.bountyKey,
      repoOwner,
      repoName,
      issueNumber: bounty.issueNumber,
      issueUrl: bounty.issueUrl,
      amount: bounty.amount,
      creatorWallet: bounty.creatorWallet,
      status: bounty.status,
      winnerId: bounty.winnerId,
      createdAt: bounty.createdAt,
      updatedAt: bounty.updatedAt,
    };
  }

  async list() {
    const bounties = await this.prisma.bounty.findMany({
      include: {
        repository: {
          select: {
            githubUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return bounties.map((bounty) => {
      const repoInfo = this.githubService.parseGithubUrl(
        bounty.repository.githubUrl,
      );

      return {
        id: bounty.id,
        bountyKey: bounty.bountyKey,
        repoOwner: repoInfo?.owner ?? '',
        repoName: repoInfo?.repo ?? '',
        issueNumber: bounty.issueNumber,
        issueUrl: bounty.issueUrl,
        amount: bounty.amount,
        creatorWallet: bounty.creatorWallet,
        status: bounty.status,
        winnerId: bounty.winnerId,
        createdAt: bounty.createdAt,
        updatedAt: bounty.updatedAt,
      };
    });
  }

  private scheduleMonitoring() {
    cron.schedule('*/15 * * * *', async () => {
      await this.monitorOpenBounties();
    });

    this.logger.log('Bounty monitor scheduled to run every 15 minutes.');
  }

  private async monitorOpenBounties() {
    if (this.monitorInProgress) {
      this.logger.warn('Bounty monitor already running. Skipping this cycle.');
      return;
    }

    this.monitorInProgress = true;

    try {
      const openBounties = await this.prisma.bounty.findMany({
        where: { status: 'OPEN' },
        include: {
          repository: {
            select: {
              githubUrl: true,
            },
          },
        },
      });

      if (openBounties.length === 0) {
        this.logger.log('No open bounties to check.');
        return;
      }

      this.logger.log(`Checking ${openBounties.length} open bounties...`);

      for (const bounty of openBounties) {
        try {
          const issueNumber = Number(bounty.issueNumber);
          const repoInfo = this.githubService.parseGithubUrl(
            bounty.repository.githubUrl,
          );

          if (!repoInfo) {
            this.logger.warn(
              `Invalid GitHub URL for repository ${bounty.repositoryId}: ${bounty.repository.githubUrl}`,
            );
            continue;
          }

          const issueInfo = await this.githubService.getIssueClosureInfo({
            owner: repoInfo.owner,
            repo: repoInfo.repo,
            issueNumber,
          });
          this.logger.log(
            `GitHub check for ${repoInfo.owner}/${repoInfo.repo}#${issueNumber}: ` +
              `closed=${issueInfo.isClosed}, ` +
              `closedBy=${issueInfo.closedByPrAuthor?.login ?? 'none'}, ` +
              `rateRemaining=${issueInfo.rateLimit?.remaining ?? 'n/a'}`,
          );

          const closedBy = issueInfo.closedByPrAuthor;
          if (issueInfo.isClosed && closedBy) {
            await this.prisma.$transaction(async (tx) => {
              const winner = await tx.user.upsert({
                where: { githubId: closedBy.databaseId },
                update: {
                  username: closedBy.login ?? undefined,
                },
                create: {
                  githubId: closedBy.databaseId,
                  username: closedBy.login ?? undefined,
                },
              });

              await tx.bounty.update({
                where: { id: bounty.id },
                data: {
                  status: 'READY_FOR_CLAIM',
                  winnerId: winner.id,
                },
              });
            });

            this.logger.log(
              `Bounty ${bounty.id} marked READY_FOR_CLAIM (winner: ${closedBy.login}).`,
            );
          }
        } catch (error) {
          if (
            error instanceof HttpException &&
            error.getStatus() === HttpStatus.TOO_MANY_REQUESTS
          ) {
            this.logger.warn(
              'GitHub rate limit hit. Stopping bounty checks for this cycle.',
            );
            break;
          }

          const message =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(
            `Failed to check bounty ${bounty.id} for ${bounty.repository.githubUrl}#${bounty.issueNumber}: ${message}`,
          );
        }

        await this.delay(this.checkDelayMs);
      }
    } finally {
      this.monitorInProgress = false;
    }
  }

  private async delay(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private buildBountyKey(
    repoOwner: string,
    repoName: string,
    issueNumber: number,
  ): string {
    const canonicalOwner = repoOwner.trim().toLowerCase();
    const canonicalRepo = repoName.trim().toLowerCase();
    const canonicalIssueNumber = Number(issueNumber);
    const canonical = `${canonicalOwner}|${canonicalRepo}|${canonicalIssueNumber}`;
    return createHash('sha256').update(canonical, 'utf8').digest('hex');
  }
}

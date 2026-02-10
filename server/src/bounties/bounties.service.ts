import { HttpException, HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import cron from 'node-cron';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { GithubService } from '../github/github.service';
import { AlgorandService } from '../algorand/algorand.service';
import { CreateBountyDto, ClaimBountyDto } from './dto';

@Injectable()
export class BountiesService implements OnModuleInit {
  private readonly logger = new Logger(BountiesService.name);
  private readonly checkDelayMs = 100; // Reduced from 350ms for faster checks
  private readonly batchSize = 5; // Process bounties in parallel batches
  private monitorInProgress = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly githubService: GithubService,
    private readonly algorandService: AlgorandService,
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
    const { repoOwner, repoName, issueNumber, amount, creatorWallet } = createBountyDto;

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
      throw new HttpException(`Repository ${repoPath} not found. Create a project with this repository first.`, HttpStatus.BAD_REQUEST);
    }

    const issueUrl = `https://github.com/${repoOwner}/${repoName}/issues/${issueNumber}`;

    // Check if a bounty already exists for this issue
    const existingBounty = await this.prisma.bounty.findUnique({
      where: { issueUrl },
    });

    if (existingBounty) {
      throw new HttpException(`A bounty already exists for this issue: ${issueUrl}`, HttpStatus.CONFLICT);
    }

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
      const repoInfo = this.githubService.parseGithubUrl(bounty.repository.githubUrl);

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

  async claim(claimBountyDto: ClaimBountyDto) {
    const { bountyId, githubId, walletAddress } = claimBountyDto;

    // 1. Find the bounty
    const bounty = await this.prisma.bounty.findUnique({
      where: { id: bountyId },
      include: {
        repository: {
          select: {
            githubUrl: true,
          },
        },
        winner: true,
      },
    });

    if (!bounty) {
      throw new HttpException('Bounty not found', HttpStatus.NOT_FOUND);
    }

    // 2. Check if bounty is ready for claim
    if (bounty.status !== 'READY_FOR_CLAIM') {
      throw new HttpException(`Bounty is not ready for claim. Current status: ${bounty.status}`, HttpStatus.BAD_REQUEST);
    }

    // 3. Verify the claimer is the winner
    if (!bounty.winner) {
      throw new HttpException('Bounty has no winner assigned', HttpStatus.BAD_REQUEST);
    }

    if (bounty.winner.githubId !== githubId) {
      throw new HttpException(
        'You are not the winner of this bounty. Only the PR author who closed the issue can claim.',
        HttpStatus.FORBIDDEN,
      );
    }

    // 4. Check if Algorand service is configured
    if (!this.algorandService.isConfigured()) {
      throw new HttpException('Blockchain service not configured. Contact administrator.', HttpStatus.SERVICE_UNAVAILABLE);
    }

    // 5. Parse repo info for on-chain withdrawal
    const repoInfo = this.githubService.parseGithubUrl(bounty.repository.githubUrl);
    if (!repoInfo) {
      throw new HttpException('Invalid repository URL', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // 6. Execute on-chain withdrawal
    let txId: string;
    try {
      const result = await this.algorandService.withdrawBounty(repoInfo.owner, repoInfo.repo, bounty.issueNumber, walletAddress);
      txId = result.txId;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to withdraw bounty on-chain: ${message}`);
      throw new HttpException(`Blockchain withdrawal failed: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // 7. Update database: mark as claimed, store wallet and tx info
    const updatedBounty = await this.prisma.bounty.update({
      where: { id: bountyId },
      data: {
        status: 'CLAIMED',
        claimedAt: new Date(),
        winner: {
          update: {
            wallet: walletAddress,
          },
        },
      },
    });

    this.logger.log(`Bounty ${bountyId} claimed by GitHub user ${githubId}. TxID: ${txId}`);

    return {
      id: updatedBounty.id,
      status: updatedBounty.status,
      claimedAt: updatedBounty.claimedAt,
      txId,
      walletAddress,
    };
  }

  private scheduleMonitoring() {
    // Run every 5 minutes instead of 15 for faster winner detection
    cron.schedule('*/5 * * * *', async () => {
      await this.monitorOpenBounties();
      // Also sync from on-chain to catch any missed updates
      await this.syncFromChain();
    });

    this.logger.log('Bounty monitor scheduled to run every 5 minutes.');
  }

  async listByWinner(githubUsername: string) {
    const user = await this.prisma.user.findFirst({
      where: { username: githubUsername },
    });

    if (!user) {
      return [];
    }

    const bounties = await this.prisma.bounty.findMany({
      where: { winnerId: user.id },
      include: {
        repository: {
          select: {
            githubUrl: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return bounties.map((bounty) => {
      const repoInfo = this.githubService.parseGithubUrl(bounty.repository.githubUrl);
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
        claimedAt: bounty.claimedAt,
        createdAt: bounty.createdAt,
        updatedAt: bounty.updatedAt,
      };
    });
  }

  /**
   * Syncs bounties from on-chain state to the database.
   * Updates status based on on-chain paid status and winner address.
   * Returns a summary of changes made.
   */
  async syncFromChain(): Promise<{
    checked: number;
    updated: number;
    newOnChain: number;
    errors: string[];
  }> {
    const result = {
      checked: 0,
      updated: 0,
      newOnChain: 0,
      errors: [] as string[],
    };

    if (!this.algorandService.isReadConfigured()) {
      this.logger.warn('Algorand service not configured for reading. Skipping on-chain sync.');
      return result;
    }

    try {
      // Fetch all on-chain bounties
      const onChainBounties = await this.algorandService.getOnChainBounties();
      result.checked = onChainBounties.length;

      if (onChainBounties.length === 0) {
        this.logger.log('No on-chain bounties found.');
        return result;
      }

      // Get all database bounties
      const dbBounties = await this.prisma.bounty.findMany({
        include: {
          repository: {
            select: {
              githubUrl: true,
            },
          },
        },
      });

      // Create a map of bountyKey -> db bounty for quick lookup
      const dbBountyMap = new Map<string, (typeof dbBounties)[0]>();
      for (const bounty of dbBounties) {
        dbBountyMap.set(bounty.bountyKey, bounty);
      }

      // Process each on-chain bounty
      for (const onChainBounty of onChainBounties) {
        // Find matching DB bounty by computing possible bounty keys
        // Since we don't have repo info from on-chain, we need to match by bountyId
        const matchingDbBounty = dbBounties.find((db) => {
          const repoInfo = this.githubService.parseGithubUrl(db.repository.githubUrl);
          if (!repoInfo) return false;
          const computedId = this.computeBountyId(repoInfo.owner, repoInfo.repo, db.issueNumber);
          return computedId === onChainBounty.bountyId;
        });

        if (!matchingDbBounty) {
          // On-chain bounty exists but not in our database
          result.newOnChain++;
          this.logger.debug(`On-chain bounty ${onChainBounty.bountyId} not found in database.`);
          continue;
        }

        // Check if we need to update status
        const needsUpdate =
          (onChainBounty.isPaid && matchingDbBounty.status !== 'CLAIMED') ||
          (!onChainBounty.isPaid && onChainBounty.winnerAddress && matchingDbBounty.status === 'OPEN');

        if (!needsUpdate) {
          continue;
        }

        try {
          if (onChainBounty.isPaid) {
            // Bounty was paid on-chain, update DB to CLAIMED
            await this.prisma.bounty.update({
              where: { id: matchingDbBounty.id },
              data: {
                status: 'CLAIMED',
                claimedAt: matchingDbBounty.claimedAt ?? new Date(),
              },
            });
            this.logger.log(`Synced bounty ${matchingDbBounty.id} to CLAIMED (on-chain paid).`);
            result.updated++;
          } else if (onChainBounty.winnerAddress && matchingDbBounty.status === 'OPEN') {
            // On-chain has winner set but not paid - unusual state, log it
            this.logger.warn(`On-chain bounty ${matchingDbBounty.id} has winner ${onChainBounty.winnerAddress} but not paid yet.`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Failed to update bounty ${matchingDbBounty.id}: ${message}`);
          this.logger.error(`Failed to update bounty ${matchingDbBounty.id}: ${message}`);
        }
      }

      this.logger.log(`On-chain sync complete: checked=${result.checked}, updated=${result.updated}, newOnChain=${result.newOnChain}`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`On-chain sync failed: ${message}`);
      result.errors.push(`Sync failed: ${message}`);
      return result;
    }
  }

  /**
   * Computes the deterministic bounty ID from repo info (same algorithm as AlgorandService)
   */
  private computeBountyId(repoOwner: string, repoName: string, issueNumber: number): bigint {
    const canonicalOwner = repoOwner.trim().toLowerCase();
    const canonicalRepo = repoName.trim().toLowerCase();
    const canonicalIssueNumber = Number(issueNumber);
    const canonical = `${canonicalOwner}|${canonicalRepo}|${canonicalIssueNumber}`;

    // djb2 hash algorithm
    let hash = BigInt(5381);
    for (let i = 0; i < canonical.length; i++) {
      hash = ((hash << BigInt(5)) + hash) ^ BigInt(canonical.charCodeAt(i));
      hash = hash & BigInt('0xFFFFFFFFFFFFFFFF'); // Keep as 64-bit
    }
    return hash;
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

      this.logger.log(`Checking ${openBounties.length} open bounties in batches of ${this.batchSize}...`);

      // Process bounties in parallel batches for faster checking
      for (let i = 0; i < openBounties.length; i += this.batchSize) {
        const batch = openBounties.slice(i, i + this.batchSize);

        const results = await Promise.allSettled(
          batch.map(async (bounty) => {
            const issueNumber = Number(bounty.issueNumber);
            const repoInfo = this.githubService.parseGithubUrl(bounty.repository.githubUrl);

            if (!repoInfo) {
              this.logger.warn(`Invalid GitHub URL for repository ${bounty.repositoryId}: ${bounty.repository.githubUrl}`);
              return null;
            }

            const issueInfo = await this.githubService.getIssueClosureInfo({
              owner: repoInfo.owner,
              repo: repoInfo.repo,
              issueNumber,
            });

            return { bounty, repoInfo, issueNumber, issueInfo };
          }),
        );

        let rateLimitHit = false;

        for (const result of results) {
          if (result.status === 'rejected') {
            const error = result.reason;
            if (error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS) {
              this.logger.warn('GitHub rate limit hit. Stopping bounty checks for this cycle.');
              rateLimitHit = true;
              break;
            }
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.warn(`Batch check failed: ${message}`);
            continue;
          }

          const data = result.value;
          if (!data) continue;

          const { bounty, repoInfo, issueNumber, issueInfo } = data;

          this.logger.debug(
            `GitHub check for ${repoInfo.owner}/${repoInfo.repo}#${issueNumber}: ` +
              `closed=${issueInfo.isClosed}, ` +
              `closedBy=${issueInfo.closedByPrAuthor?.login ?? 'none'}`,
          );

          const closedBy = issueInfo.closedByPrAuthor;
          if (issueInfo.isClosed && closedBy) {
            try {
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
              this.logger.log(`Bounty ${bounty.id} marked READY_FOR_CLAIM (winner: ${closedBy.login}).`);
            } catch (dbError) {
              const message = dbError instanceof Error ? dbError.message : 'Unknown error';
              this.logger.error(`Failed to update bounty ${bounty.id}: ${message}`);
            }
          }
        }

        if (rateLimitHit) break;

        // Small delay between batches to avoid overwhelming GitHub API
        if (i + this.batchSize < openBounties.length) {
          await this.delay(this.checkDelayMs);
        }
      }
    } finally {
      this.monitorInProgress = false;
    }
  }

  private async delay(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private buildBountyKey(repoOwner: string, repoName: string, issueNumber: number): string {
    const canonicalOwner = repoOwner.trim().toLowerCase();
    const canonicalRepo = repoName.trim().toLowerCase();
    const canonicalIssueNumber = Number(issueNumber);
    const canonical = `${canonicalOwner}|${canonicalRepo}|${canonicalIssueNumber}`;
    return createHash('sha256').update(canonical, 'utf8').digest('hex');
  }
}

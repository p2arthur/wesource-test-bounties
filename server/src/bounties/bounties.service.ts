import { HttpException, HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import cron from 'node-cron';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { GithubService } from '../github/github.service';
import { AlgorandService, OnChainBounty } from '../algorand/algorand.service';
import { OracleService } from '../oracle/oracle.service';
import { TransactionsService } from '../transactions/transactions.service';
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
    private readonly oracleService: OracleService,
    private readonly transactionsService: TransactionsService,
  ) {}

  onModuleInit() {
    this.scheduleMonitoring();
    void this.runStartupCheck();
  }

  private async runStartupCheck() {
    this.logger.log('Running Oracle bounty validation on startup...');
    await this.runOracleValidation();
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

    const amountMicroAlgos = Math.round(amount * 1_000_000);

    const bounty = await this.prisma.bounty.create({
      data: {
        issueNumber: issueNumber,
        bountyKey,
        issueUrl,
        amount: amountMicroAlgos,
        creatorWallet,
        status: 'OPEN',
        repositoryId: repository.id,
        githubIssueId: BigInt(0),
      },
    });

    // Record transaction for bounty creation
    await this.transactionsService.create(
      creatorWallet,
      'BOUNTY_CREATED',
      bounty.id,
      amountMicroAlgos,
    );

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

  async list(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [bounties, total] = await Promise.all([
      this.prisma.bounty.findMany({
        include: {
          repository: {
            select: {
              githubUrl: true,
            },
          },
          winner: {
            select: { id: true, username: true, wallet: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.bounty.count(),
    ]);

    const data = bounties.map((bounty) => {
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
        winner: bounty.winner ?? null,
        createdAt: bounty.createdAt,
        updatedAt: bounty.updatedAt,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getById(id: number) {
    const bounty = await this.prisma.bounty.findUnique({
      where: { id },
      include: {
        repository: { select: { githubUrl: true } },
        winner: { select: { id: true, username: true, wallet: true } },
      },
    });

    if (!bounty) {
      throw new HttpException('Bounty not found', HttpStatus.NOT_FOUND);
    }

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
      winner: bounty.winner ?? null,
      claimedAt: bounty.claimedAt,
      createdAt: bounty.createdAt,
      updatedAt: bounty.updatedAt,
    };
  }

  async claim(claimBountyDto: ClaimBountyDto, authWallet: string) {
    const { bountyId } = claimBountyDto;

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

    if (!bounty.winner.wallet) {
      throw new HttpException('Winner has not linked a wallet. Please link your wallet first.', HttpStatus.FORBIDDEN);
    }

    if (bounty.winner.wallet !== authWallet) {
      throw new HttpException(
        'You are not the winner of this bounty. Only the authenticated wallet matching the winner can claim.',
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
      const result = await this.algorandService.withdrawBounty(repoInfo.owner, repoInfo.repo, bounty.issueNumber, authWallet);
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
          connect: { id: bounty.winner.id },
        },
      },
    });

    // Record transaction for bounty claim
    await this.transactionsService.create(
      authWallet,
      'BOUNTY_CLAIMED',
      bountyId,
      bounty.amount,
    );

    this.logger.log(`Bounty ${bountyId} claimed by wallet ${authWallet}. TxID: ${txId}`);

    return {
      id: updatedBounty.id,
      status: updatedBounty.status,
      claimedAt: updatedBounty.claimedAt,
      txId,
      walletAddress: authWallet,
    };
  }

  async refund(bountyId: number, authWallet: string) {
    // 1. Find the bounty
    const bounty = await this.prisma.bounty.findUnique({
      where: { id: bountyId },
      include: {
        repository: { select: { githubUrl: true } },
      },
    });

    if (!bounty) {
      throw new HttpException('Bounty not found', HttpStatus.NOT_FOUND);
    }

    // 2. Check if bounty is refundable
    if (bounty.status !== 'REFUNDABLE') {
      throw new HttpException(`Bounty is not refundable. Current status: ${bounty.status}`, HttpStatus.BAD_REQUEST);
    }

    // 3. Verify the authenticated wallet is the creator
    if (bounty.creatorWallet !== authWallet) {
      throw new HttpException('You are not the creator of this bounty', HttpStatus.FORBIDDEN);
    }

    // 4. Check if Algorand service is configured
    if (!this.algorandService.isConfigured()) {
      throw new HttpException('Blockchain service not configured. Contact administrator.', HttpStatus.SERVICE_UNAVAILABLE);
    }

    // 5. Parse repo info for on-chain refund
    const repoInfo = this.githubService.parseGithubUrl(bounty.repository.githubUrl);
    if (!repoInfo) {
      throw new HttpException('Invalid repository URL', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // 6. Execute on-chain refund
    let txId: string;
    try {
      const result = await this.algorandService.refundBounty(repoInfo.owner, repoInfo.repo, bounty.issueNumber, authWallet);
      txId = result.txId;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to refund bounty on-chain: ${message}`);
      throw new HttpException(`Blockchain refund failed: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // 7. Update database: mark as refunded
    const updatedBounty = await this.prisma.bounty.update({
      where: { id: bountyId },
      data: { status: 'REFUNDED' },
    });

    // Record transaction for bounty refund
    await this.transactionsService.create(
      authWallet,
      'BOUNTY_REFUNDED',
      bountyId,
      bounty.amount,
    );

    this.logger.log(`Bounty ${bountyId} refunded by wallet ${authWallet}. TxID: ${txId}`);

    return {
      id: updatedBounty.id,
      status: updatedBounty.status,
      txId,
      walletAddress: authWallet,
    };
  }

  async revoke(bountyId: number, authWallet: string) {
    // 1. Find the bounty
    const bounty = await this.prisma.bounty.findUnique({
      where: { id: bountyId },
      include: {
        repository: { select: { githubUrl: true } },
      },
    });

    if (!bounty) {
      throw new HttpException('Bounty not found', HttpStatus.NOT_FOUND);
    }

    // 2. Check if bounty is eligible for revocation
    if (bounty.status !== 'REFUNDABLE' && bounty.status !== 'OPEN') {
      throw new HttpException(`Bounty is not eligible for revocation. Current status: ${bounty.status}`, HttpStatus.BAD_REQUEST);
    }

    // 3. Verify the authenticated wallet is the manager
    const managerAddress = this.algorandService.getManagerAddress();
    if (!managerAddress) {
      throw new HttpException('Manager address not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    if (authWallet !== managerAddress) {
      throw new HttpException('You are not the manager of this bounty', HttpStatus.FORBIDDEN);
    }

    // 4. Check if Algorand service is configured
    if (!this.algorandService.isConfigured()) {
      throw new HttpException('Blockchain service not configured. Contact administrator.', HttpStatus.SERVICE_UNAVAILABLE);
    }

    // 5. Parse repo info for on-chain revocation
    const repoInfo = this.githubService.parseGithubUrl(bounty.repository.githubUrl);
    if (!repoInfo) {
      throw new HttpException('Invalid repository URL', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // 6. Execute on-chain revocation (funds returned to creator)
    let txId: string;
    try {
      const result = await this.algorandService.revokeBounty(repoInfo.owner, repoInfo.repo, bounty.issueNumber, bounty.creatorWallet);
      txId = result.txId;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to revoke bounty on-chain: ${message}`);
      throw new HttpException(`Blockchain revocation failed: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // 7. Update database: mark as cancelled
    const updatedBounty = await this.prisma.bounty.update({
      where: { id: bountyId },
      data: { status: 'CANCELLED' },
    });

    // Record transaction for bounty revocation
    await this.transactionsService.create(
      bounty.creatorWallet,
      'BOUNTY_REVOKED',
      bountyId,
      bounty.amount,
    );

    this.logger.log(`Bounty ${bountyId} revoked by manager ${authWallet}. TxID: ${txId}`);

    return {
      id: updatedBounty.id,
      status: updatedBounty.status,
      txId,
      walletAddress: authWallet,
    };
  }

  private scheduleMonitoring() {
    // Run Oracle validation every 5 minutes for faster winner detection
    cron.schedule('*/5 * * * *', async () => {
      await this.runOracleValidation();
      await this.reconcileWithChain();
    });

    this.logger.log('Oracle validation scheduled to run every 5 minutes.');
  }

  /**
   * Run Oracle validation with error handling
   * This is the new validation method that uses the Oracle service
   */
  private async runOracleValidation() {
    try {
      const report = await this.oracleService.validateBounties();
      this.logger.log(
        `Oracle validation: ${report.bountiesChecked} checked, ${report.bountiesUpdated} updated ` +
          `(${report.readyForClaim} ready, ${report.cancelled} cancelled, ${report.refundable} refundable)`,
      );
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === 409) {
        // Oracle already running, skip
        return;
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Oracle validation failed: ${message}`);
    }
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
   * Reconciles the database with on-chain state.
   *
   * Goes DB→chain (not chain→DB) because the djb2 hash stored on-chain is
   * one-way: we cannot recover repo/issue metadata from a hash, so the DB
   * must be the starting point. For each active DB bounty we compute its
   * bountyId, look it up in a pre-fetched on-chain map, and apply any
   * status updates needed.
   *
   * Status transitions applied:
   *   OPEN / READY_FOR_CLAIM  →  CLAIMED         (on-chain isPaid = true)
   *   OPEN                    →  READY_FOR_CLAIM  (on-chain winnerAddress set, not yet paid)
   */
  async reconcileWithChain(): Promise<{
    checked: number;
    claimedSynced: number;
    readyForClaimSynced: number;
    notOnChain: number;
    valueMismatches: { bountyId: number; dbAmountMicroAlgos: number; chainAmountMicroAlgos: number }[];
    errors: string[];
  }> {
    const report = {
      checked: 0,
      claimedSynced: 0,
      readyForClaimSynced: 0,
      notOnChain: 0,
      valueMismatches: [] as { bountyId: number; dbAmountMicroAlgos: number; chainAmountMicroAlgos: number }[],
      errors: [] as string[],
    };

    if (!this.algorandService.isReadConfigured()) {
      this.logger.warn('Algorand service not configured for reading. Skipping reconciliation.');
      return report;
    }

    // Fetch all on-chain boxes in one call → map by bountyId for O(1) lookup
    const onChainBounties = await this.algorandService.getOnChainBounties();
    const onChainMap = new Map<bigint, OnChainBounty>();
    for (const b of onChainBounties) {
      onChainMap.set(b.bountyId, b);
    }

    // Only reconcile non-terminal bounties
    const dbBounties = await this.prisma.bounty.findMany({
      where: { status: { in: ['OPEN', 'READY_FOR_CLAIM'] } },
      include: { repository: { select: { githubUrl: true } } },
    });

    report.checked = dbBounties.length;

    for (const bounty of dbBounties) {
      const repoInfo = this.githubService.parseGithubUrl(bounty.repository.githubUrl);
      if (!repoInfo) {
        report.errors.push(`Bounty ${bounty.id}: invalid repository URL`);
        continue;
      }

      const bountyId = this.computeBountyId(repoInfo.owner, repoInfo.repo, bounty.issueNumber);
      const onChain = onChainMap.get(bountyId);

      if (!onChain) {
        // DB bounty exists but no matching box on-chain — it may not have been
        // funded yet, or the transaction is still pending.
        report.notOnChain++;
        this.logger.debug(`Bounty ${bounty.id} (id=${bountyId}) has no on-chain box yet.`);
        continue;
      }

      // Flag amount discrepancies (microAlgos stored in DB vs chain)
      const chainAmount = Number(onChain.totalValue);
      if (chainAmount !== bounty.amount) {
        report.valueMismatches.push({
          bountyId: bounty.id,
          dbAmountMicroAlgos: bounty.amount,
          chainAmountMicroAlgos: chainAmount,
        });
        this.logger.warn(`Bounty ${bounty.id} amount mismatch: DB=${bounty.amount} chain=${chainAmount} microAlgos`);
      }

      try {
        if (onChain.isPaid) {
          await this.prisma.bounty.update({
            where: { id: bounty.id },
            data: { status: 'CLAIMED', claimedAt: bounty.claimedAt ?? new Date() },
          });
          report.claimedSynced++;
          this.logger.log(`Reconciled bounty ${bounty.id} → CLAIMED (on-chain paid).`);
        } else if (onChain.winnerAddress && bounty.status === 'OPEN') {
          // Winner set on-chain but DB not yet updated — link if we know the user
          const winner = await this.prisma.user.findFirst({ where: { wallet: onChain.winnerAddress } });
          await this.prisma.bounty.update({
            where: { id: bounty.id },
            data: {
              status: 'READY_FOR_CLAIM',
              ...(winner && { winnerId: winner.id }),
            },
          });
          report.readyForClaimSynced++;
          this.logger.log(`Reconciled bounty ${bounty.id} → READY_FOR_CLAIM (on-chain winner: ${onChain.winnerAddress}).`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        report.errors.push(`Bounty ${bounty.id}: ${message}`);
        this.logger.error(`Failed to reconcile bounty ${bounty.id}: ${message}`);
      }
    }

    this.logger.log(
      `Reconciliation complete: checked=${report.checked}, claimed=${report.claimedSynced}, ` +
        `readyForClaim=${report.readyForClaimSynced}, notOnChain=${report.notOnChain}, ` +
        `mismatches=${report.valueMismatches.length}, errors=${report.errors.length}`,
    );

    return report;
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
            if (error instanceof HttpException && error.getStatus() === 429) {
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

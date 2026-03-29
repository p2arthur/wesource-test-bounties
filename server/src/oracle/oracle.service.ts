import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GithubService } from '../github/github.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TransactionsService } from '../transactions/transactions.service';
import { Prisma } from '@prisma/client';

type BountyWithRepository = Prisma.BountyGetPayload<{
  include: { repository: { select: { githubUrl: true } } };
}>;

export interface OracleValidationResult {
  bountyId: number;
  issueNumber: number;
  status: 'processed' | 'skipped' | 'error';
  action?: 'ready_for_claim' | 'cancelled' | 'refundable' | 'no_change';
  winner?: {
    githubId: number;
    login: string;
  };
  stateReason?: string;
  eventId?: number;
  error?: string;
}

export interface OracleSyncReport {
  startedAt: Date;
  completedAt: Date;
  bountiesChecked: number;
  bountiesUpdated: number;
  readyForClaim: number;
  cancelled: number;
  refundable: number;
  errors: number;
  rateLimitHit: boolean;
  results: OracleValidationResult[];
}

@Injectable()
export class OracleService {
  private readonly logger = new Logger(OracleService.name);
  private syncInProgress = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly githubService: GithubService,
    private readonly notificationsService: NotificationsService,
    private readonly transactionsService: TransactionsService,
  ) {}

  /**
   * Main Oracle validation logic:
   * - Fetch all Open bounties
   * - For each, check GitHub events with If-Modified-Since
   * - Identify win conditions: closed with state_reason="completed"
   * - Verify identity attribution: closed_by and commit author
   * - Handle not_planned closures: mark as Cancelled/Refundable
   * - Log event_id to prevent double processing
   */
  async validateBounties(): Promise<OracleSyncReport> {
    if (this.syncInProgress) {
      this.logger.warn('Oracle validation already in progress. Skipping this cycle.');
      throw new HttpException('Oracle validation already in progress', HttpStatus.CONFLICT);
    }

    this.syncInProgress = true;
    const startedAt = new Date();

    const report: OracleSyncReport = {
      startedAt,
      completedAt: new Date(),
      bountiesChecked: 0,
      bountiesUpdated: 0,
      readyForClaim: 0,
      cancelled: 0,
      refundable: 0,
      errors: 0,
      rateLimitHit: false,
      results: [],
    };

    try {
      // Fetch all Open bounties
      const openBounties: BountyWithRepository[] = await this.prisma.bounty.findMany({
        where: { status: 'OPEN' },
        include: {
          repository: {
            select: {
              githubUrl: true,
            },
          },
        },
        orderBy: {
          lastCheckedAt: 'asc', // Check oldest first
        },
      });

      if (openBounties.length === 0) {
        this.logger.log('No open bounties to validate.');
        report.completedAt = new Date();
        return report;
      }

      this.logger.log(`Starting Oracle validation for ${openBounties.length} open bounties...`);

      // Process each bounty
      for (const bounty of openBounties) {
        report.bountiesChecked++;

        const repoInfo = this.githubService.parseGithubUrl(bounty.repository.githubUrl);
        if (!repoInfo) {
          this.logger.warn(`Invalid GitHub URL for bounty ${bounty.id}: ${bounty.repository.githubUrl}`);
          report.results.push({
            bountyId: bounty.id,
            issueNumber: bounty.issueNumber,
            status: 'error',
            error: 'Invalid GitHub URL',
          });
          report.errors++;
          continue;
        }

        try {
          console.log('Bounty data', bounty);
          const result = await this.validateSingleBounty(bounty, repoInfo);
          report.results.push(result);

          if (result.status === 'processed') {
            report.bountiesUpdated++;
            if (result.action === 'ready_for_claim') report.readyForClaim++;
            else if (result.action === 'cancelled') report.cancelled++;
            else if (result.action === 'refundable') report.refundable++;
          } else if (result.status === 'error') {
            report.errors++;
          }
        } catch (error) {
          // Handle rate limiting
          if (error instanceof HttpException && error.getStatus() === 429) {
            this.logger.warn('GitHub rate limit hit. Stopping Oracle validation.');
            report.rateLimitHit = true;
            break;
          }

          const message = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(`Failed to validate bounty ${bounty.id}: ${message}`);
          report.results.push({
            bountyId: bounty.id,
            issueNumber: bounty.issueNumber,
            status: 'error',
            error: message,
          });
          report.errors++;
        }

        // Small delay to avoid overwhelming GitHub API
        await this.delay(100);
      }

      report.completedAt = new Date();
      const duration = report.completedAt.getTime() - startedAt.getTime();

      this.logger.log(
        `Oracle validation complete: ${report.bountiesChecked} checked, ` +
          `${report.bountiesUpdated} updated (${report.readyForClaim} ready, ` +
          `${report.cancelled} cancelled, ${report.refundable} refundable), ` +
          `${report.errors} errors in ${duration}ms`,
      );

      return report;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Validate a single bounty by checking its GitHub issue events
   */
  private async validateSingleBounty(
    bounty: BountyWithRepository,
    repoInfo: { owner: string; repo: string },
  ): Promise<OracleValidationResult> {
    const { owner, repo } = repoInfo;
    const issueNumber = bounty.issueNumber;

    // Fetch events with If-Modified-Since for efficiency
    const eventParams: {
      owner: string;
      repo: string;
      issueNumber: number;
      ifModifiedSince?: Date;
    } = {
      owner,
      repo,
      issueNumber,
    };
    if (bounty.lastCheckedAt) {
      eventParams.ifModifiedSince = bounty.lastCheckedAt as Date;
    }
    const events = await this.githubService.getIssueEvents(eventParams);

    // Update lastCheckedAt regardless of whether we found new events
    await this.prisma.bounty.update({
      where: { id: bounty.id },
      data: { lastCheckedAt: new Date() },
    });

    // No new events
    if (events.length === 0) {
      return {
        bountyId: bounty.id,
        issueNumber,
        status: 'skipped',
        action: 'no_change',
      };
    }

    // Look for the most recent "closed" event
    const closedEvents = events
      .filter((e) => e.event === 'closed')
      .sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

    if (closedEvents.length === 0) {
      return {
        bountyId: bounty.id,
        issueNumber,
        status: 'skipped',
        action: 'no_change',
      };
    }

    const closedEvent = closedEvents[0];

    // Check if we've already processed this event
    if (bounty.processedEventId && BigInt(closedEvent.id) <= bounty.processedEventId) {
      return {
        bountyId: bounty.id,
        issueNumber,
        status: 'skipped',
        action: 'no_change',
      };
    }

    // CRITICAL: Check state_reason
    const stateReason = closedEvent.state_reason;

    // If state_reason is "not_planned", mark as CANCELLED or REFUNDABLE
    if (stateReason === 'not_planned') {
      await this.prisma.bounty.update({
        where: { id: bounty.id },
        data: {
          status: 'REFUNDABLE',
          processedEventId: BigInt(closedEvent.id),
          stateReason: stateReason,
        },
      });

      // Create notification for bounty creator
      await this.notificationsService.createNotification(
        bounty.creatorWallet,
        'refund_available',
        `Your bounty for ${owner}/${repo}#${issueNumber} is now refundable. The issue was closed as not planned.`,
        bounty.id,
      );

      // Record transaction for bounty cancellation
      await this.transactionsService.create(
        bounty.creatorWallet,
        'BOUNTY_CANCELLED',
        bounty.id,
        bounty.amount,
      );

      this.logger.log(`Bounty ${bounty.id} (${owner}/${repo}#${issueNumber}) marked REFUNDABLE: closed as not_planned`);

      return {
        bountyId: bounty.id,
        issueNumber,
        status: 'processed',
        action: 'refundable',
        stateReason,
        eventId: closedEvent.id,
      };
    }

    // Only process "completed" closures for payout
    if (stateReason !== 'completed') {
      this.logger.debug(
        `Bounty ${bounty.id} (${owner}/${repo}#${issueNumber}): closed but state_reason=${stateReason || 'null'}, not processing`,
      );

      return {
        bountyId: bounty.id,
        issueNumber,
        status: 'skipped',
        action: 'no_change',
      };
    }

    // Identity Attribution: Find the winner
    let winnerId: number | null = null;
    let winnerLogin: string | null = null;

    // Priority 1: If commit_id exists, cross-reference to find commit author
    if (closedEvent.commit_id) {
      const commitAuthor = await this.githubService.getCommitAuthor({
        owner,
        repo,
        commitSha: closedEvent.commit_id,
      });

      if (commitAuthor?.author) {
        winnerId = commitAuthor.author.id;
        winnerLogin = commitAuthor.author.login;
        this.logger.debug(`Bounty ${bounty.id}: Winner determined from commit ${closedEvent.commit_id}: ${winnerLogin} (${winnerId})`);
      }
    }

    // Priority 2: If no commit author, use closed_by actor
    if (!winnerId && closedEvent.actor) {
      winnerId = closedEvent.actor.id;
      winnerLogin = closedEvent.actor.login;
      this.logger.debug(`Bounty ${bounty.id}: Winner determined from close actor: ${winnerLogin} (${winnerId})`);
    }

    // If we still don't have a winner, we can't process this bounty
    if (!winnerId || !winnerLogin) {
      this.logger.warn(`Bounty ${bounty.id} (${owner}/${repo}#${issueNumber}): Issue closed as completed but no winner identified`);

      return {
        bountyId: bounty.id,
        issueNumber,
        status: 'error',
        error: 'No winner identified',
      };
    }

    // Upsert winner and update bounty status
    let winnerWallet: string | null = null;
    await this.prisma.$transaction(async (tx) => {
      const winner = await tx.user.upsert({
        where: { githubId: winnerId },
        update: {
          username: winnerLogin ?? undefined,
        },
        create: {
          githubId: winnerId,
          username: winnerLogin ?? undefined,
        },
      });

      winnerWallet = winner.wallet;

      await tx.bounty.update({
        where: { id: bounty.id },
        data: {
          status: 'READY_FOR_CLAIM',
          winnerId: winner.id,
          processedEventId: BigInt(closedEvent.id),
          stateReason: stateReason,
          closedByCommitId: closedEvent.commit_id,
        },
      });
    });

    if (!winnerWallet) {
      this.logger.warn(`Bounty ${bounty.id} (${owner}/${repo}#${issueNumber}) is ready but winner ${winnerLogin} has no wallet linked`);
    } else {
      // Create notification for the winner
      await this.notificationsService.createNotification(
        winnerWallet,
        'bounty_won',
        `Congratulations! You won the bounty for ${owner}/${repo}#${issueNumber}. You can now claim your reward.`,
        bounty.id,
      );

      this.logger.log(`Bounty ${bounty.id} (${owner}/${repo}#${issueNumber}) marked READY_FOR_CLAIM: winner=${winnerLogin} (${winnerId})`);
    }

    return {
      bountyId: bounty.id,
      issueNumber,
      status: 'processed',
      action: 'ready_for_claim',
      winner: {
        githubId: winnerId,
        login: winnerLogin,
      },
      stateReason,
      eventId: closedEvent.id,
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

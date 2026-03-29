import { Test, TestingModule } from '@nestjs/testing';
import { OracleService } from './oracle.service';
import { PrismaService } from '../prisma/prisma.service';
import { GithubService } from '../github/github.service';
import { BountiesService } from '../bounties/bounties.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('OracleService', () => {
  let oracleService: OracleService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    bounty: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    user: {
      upsert: jest.fn(),
    },
    $transaction: jest.fn((callback) =>
      callback({
        user: { upsert: jest.fn() },
        bounty: { update: jest.fn() },
      }),
    ),
  };

  const mockGithubService = {
    getIssueEvents: jest.fn(),
    getCommitAuthor: jest.fn(),
  };

  const mockBountiesService = {
    updateStatus: jest.fn(),
  };

  const mockNotificationsService = {
    createNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OracleService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: GithubService, useValue: mockGithubService },
        { provide: BountiesService, useValue: mockBountiesService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    oracleService = module.get<OracleService>(OracleService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('validateSingleBounty - winner wallet check', () => {
    const mockBounty = {
      id: 1,
      issueNumber: 123,
      issueUrl: 'https://github.com/test-owner/test-repo/issues/123',
      bountyKey: '0000000000000001',
      amount: 10000000,
      status: 'OPEN' as const,
      repositoryId: 1,
      creatorWallet: 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
      winnerId: null,
      githubIssueId: BigInt(123456),
      claimerPR: null,
      lastCheckedAt: new Date(),
      processedEventId: null,
      stateReason: null,
      closedByCommitId: null,
      claimedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      repository: {
        githubUrl: 'https://github.com/test-owner/test-repo',
      },
    };

    const mockClosedEvent = {
      id: '123456',
      event: 'closed',
      state_reason: 'completed',
      created_at: new Date().toISOString(),
      actor: {
        id: 98765432,
        login: 'test-winner',
      },
      commit_id: 'abc123',
    };

    beforeEach(() => {
      mockGithubService.getIssueEvents.mockResolvedValue([mockClosedEvent]);
      mockGithubService.getCommitAuthor.mockResolvedValue({
        author: {
          id: 98765432,
          login: 'test-winner',
        },
      });
    });

    it('should log warning when winner has no wallet linked', async () => {
      const winnerWithoutWallet = {
        id: 100,
        githubId: 98765432,
        username: 'test-winner',
        wallet: null,
      };

      // Mock transaction to return winner without wallet
      const mockTransaction = {
        user: {
          upsert: jest.fn().mockResolvedValue(winnerWithoutWallet),
        },
        bounty: {
          update: jest.fn().mockResolvedValue({}),
        },
      };

      mockPrismaService.$transaction.mockImplementation((callback) => callback(mockTransaction));

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const loggerWarnSpy = jest.spyOn(oracleService['logger'], 'warn').mockImplementation();
      const loggerLogSpy = jest.spyOn(oracleService['logger'], 'log').mockImplementation();

      await oracleService['validateSingleBounty'](mockBounty, { owner: 'test-owner', repo: 'test-repo' });

      // Check that transaction was called
      expect(mockPrismaService.$transaction).toHaveBeenCalled();

      // Check that winner was upserted
      expect(mockTransaction.user.upsert).toHaveBeenCalledWith({
        where: { githubId: 98765432 },
        update: { username: 'test-winner' },
        create: { githubId: 98765432, username: 'test-winner' },
      });

      // Check that bounty was updated to READY_FOR_CLAIM
      expect(mockTransaction.bounty.update).toHaveBeenCalledWith({
        where: { id: mockBounty.id },
        data: {
          status: 'READY_FOR_CLAIM',
          winnerId: winnerWithoutWallet.id,
          processedEventId: BigInt(mockClosedEvent.id),
          stateReason: 'completed',
          closedByCommitId: mockClosedEvent.commit_id,
        },
      });

      // The logger.warn should have been called with the wallet warning
      expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining('ready but winner test-winner has no wallet linked'));

      consoleSpy.mockRestore();
      loggerWarnSpy.mockRestore();
      loggerLogSpy.mockRestore();
    });

    it('should not log warning when winner has wallet linked', async () => {
      const winnerWithWallet = {
        id: 100,
        githubId: 98765432,
        username: 'test-winner',
        wallet: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      };

      const mockTransaction = {
        user: {
          upsert: jest.fn().mockResolvedValue(winnerWithWallet),
        },
        bounty: {
          update: jest.fn().mockResolvedValue({}),
        },
      };

      mockPrismaService.$transaction.mockImplementation((callback) => callback(mockTransaction));

      const loggerSpy = jest.spyOn(oracleService['logger'], 'log').mockImplementation();

      await oracleService['validateSingleBounty'](mockBounty, { owner: 'test-owner', repo: 'test-repo' });

      // Check that the specific wallet warning was NOT logged
      const walletWarningCalls = loggerSpy.mock.calls.filter((call) => call[0].includes('has no wallet linked'));
      expect(walletWarningCalls).toHaveLength(0);

      // But the success log should have been called
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('marked READY_FOR_CLAIM: winner=test-winner'));

      loggerSpy.mockRestore();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { BountiesService } from './bounties.service';
import { PrismaService } from '../prisma/prisma.service';
import { AlgorandService } from '../algorand/algorand.service';
import { GithubService } from '../github/github.service';
import { OracleService } from '../oracle/oracle.service';
import { ClaimBountyDto } from './dto';

describe('BountiesService', () => {
  let bountiesService: BountiesService;
  let prismaService: PrismaService;
  let algorandService: AlgorandService;

  const mockPrismaService = {
    bounty: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockAlgorandService = {
    isConfigured: jest.fn(),
    withdrawBounty: jest.fn(),
  };

  const mockGithubService = {
    parseGithubUrl: jest.fn(),
  };

  const mockOracleService = {
    validateBounties: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BountiesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AlgorandService, useValue: mockAlgorandService },
        { provide: GithubService, useValue: mockGithubService },
        { provide: OracleService, useValue: mockOracleService },
      ],
    }).compile();

    bountiesService = module.get<BountiesService>(BountiesService);
    prismaService = module.get<PrismaService>(PrismaService);
    algorandService = module.get<AlgorandService>(AlgorandService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('claim', () => {
    const claimDto: ClaimBountyDto = { bountyId: 1 };
    const authWallet = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const winnerWallet = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const differentWallet = 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

    const mockBounty = {
      id: 1,
      issueNumber: 123,
      status: 'READY_FOR_CLAIM' as const,
      repository: {
        githubUrl: 'https://github.com/test-owner/test-repo',
      },
      winner: {
        id: 100,
        githubId: 12345678,
        wallet: winnerWallet,
      },
    };

    beforeEach(() => {
      mockAlgorandService.isConfigured.mockReturnValue(true);
      mockGithubService.parseGithubUrl.mockReturnValue({
        owner: 'test-owner',
        repo: 'test-repo',
      });
    });

    it('should successfully claim a bounty with correct wallet', async () => {
      mockPrismaService.bounty.findUnique.mockResolvedValue(mockBounty);
      mockAlgorandService.withdrawBounty.mockResolvedValue({ txId: 'test-tx-id' });
      mockPrismaService.bounty.update.mockResolvedValue({
        ...mockBounty,
        status: 'CLAIMED',
        claimedAt: new Date(),
      });

      const result = await bountiesService.claim(claimDto, authWallet);

      expect(prismaService.bounty.findUnique).toHaveBeenCalledWith({
        where: { id: claimDto.bountyId },
        include: {
          repository: { select: { githubUrl: true } },
          winner: true,
        },
      });

      expect(algorandService.withdrawBounty).toHaveBeenCalledWith('test-owner', 'test-repo', mockBounty.issueNumber, authWallet);

      expect(prismaService.bounty.update).toHaveBeenCalledWith({
        where: { id: claimDto.bountyId },
        data: {
          status: 'CLAIMED',
          claimedAt: expect.any(Date),
          winner: { connect: { id: mockBounty.winner.id } },
        },
      });

      expect(result).toEqual({
        id: mockBounty.id,
        status: 'CLAIMED',
        claimedAt: expect.any(Date),
        txId: 'test-tx-id',
        walletAddress: authWallet,
      });
    });

    it('should throw 404 if bounty not found', async () => {
      mockPrismaService.bounty.findUnique.mockResolvedValue(null);

      await expect(bountiesService.claim(claimDto, authWallet)).rejects.toThrow(
        new HttpException('Bounty not found', HttpStatus.NOT_FOUND),
      );
    });

    it('should throw 400 if bounty is not READY_FOR_CLAIM', async () => {
      const openBounty = { ...mockBounty, status: 'OPEN' as const };
      mockPrismaService.bounty.findUnique.mockResolvedValue(openBounty);

      await expect(bountiesService.claim(claimDto, authWallet)).rejects.toThrow(
        new HttpException('Bounty is not ready for claim. Current status: OPEN', HttpStatus.BAD_REQUEST),
      );
    });

    it('should throw 400 if bounty has no winner', async () => {
      const noWinnerBounty = { ...mockBounty, winner: null };
      mockPrismaService.bounty.findUnique.mockResolvedValue(noWinnerBounty);

      await expect(bountiesService.claim(claimDto, authWallet)).rejects.toThrow(
        new HttpException('Bounty has no winner assigned', HttpStatus.BAD_REQUEST),
      );
    });

    it('should throw 403 if winner has no wallet linked', async () => {
      const noWalletWinner = { ...mockBounty.winner, wallet: null };
      const noWalletBounty = { ...mockBounty, winner: noWalletWinner };
      mockPrismaService.bounty.findUnique.mockResolvedValue(noWalletBounty);

      await expect(bountiesService.claim(claimDto, authWallet)).rejects.toThrow(
        new HttpException('Winner has not linked a wallet. Please link your wallet first.', HttpStatus.FORBIDDEN),
      );
    });

    it('should throw 403 if authenticated wallet does not match winner wallet', async () => {
      mockPrismaService.bounty.findUnique.mockResolvedValue(mockBounty);

      await expect(bountiesService.claim(claimDto, differentWallet)).rejects.toThrow(
        new HttpException(
          'You are not the winner of this bounty. Only the authenticated wallet matching the winner can claim.',
          HttpStatus.FORBIDDEN,
        ),
      );
    });

    it('should throw 503 if Algorand service not configured', async () => {
      mockPrismaService.bounty.findUnique.mockResolvedValue(mockBounty);
      mockAlgorandService.isConfigured.mockReturnValue(false);

      await expect(bountiesService.claim(claimDto, authWallet)).rejects.toThrow(
        new HttpException('Blockchain service not configured. Contact administrator.', HttpStatus.SERVICE_UNAVAILABLE),
      );
    });

    it('should throw 500 if repository URL is invalid', async () => {
      mockPrismaService.bounty.findUnique.mockResolvedValue(mockBounty);
      mockGithubService.parseGithubUrl.mockReturnValue(null);

      await expect(bountiesService.claim(claimDto, authWallet)).rejects.toThrow(
        new HttpException('Invalid repository URL', HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });

    it('should throw 500 if on-chain withdrawal fails', async () => {
      mockPrismaService.bounty.findUnique.mockResolvedValue(mockBounty);
      mockAlgorandService.withdrawBounty.mockRejectedValue(new Error('Blockchain error'));

      await expect(bountiesService.claim(claimDto, authWallet)).rejects.toThrow(
        new HttpException('Blockchain withdrawal failed: Blockchain error', HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });
  });
});

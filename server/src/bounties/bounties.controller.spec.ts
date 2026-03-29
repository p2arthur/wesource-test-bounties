import { Test, TestingModule } from '@nestjs/testing';
import { BountiesController } from './bounties.controller';
import { BountiesService } from './bounties.service';
import { AuthService } from '../auth/auth.service';
import { AuthGuard } from '../auth/auth.guard';
import { Web3AuthGuard } from '../auth/web3auth.guard';
import { WalletGuard } from '../auth/wallet.guard';
import { ClaimBountyDto, LinkWalletDto } from './dto';

describe('BountiesController', () => {
  let bountiesController: BountiesController;
  let bountiesService: BountiesService;
  let authService: AuthService;

  const mockBountiesService = {
    claim: jest.fn(),
  };

  const mockAuthService = {
    linkIdentity: jest.fn(),
  };

  const mockAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockWeb3AuthGuard = {};
  const mockWalletGuard = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BountiesController],
      providers: [
        { provide: BountiesService, useValue: mockBountiesService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: AuthGuard, useValue: mockAuthGuard },
        { provide: Web3AuthGuard, useValue: mockWeb3AuthGuard },
        { provide: WalletGuard, useValue: mockWalletGuard },
      ],
    }).compile();

    bountiesController = module.get<BountiesController>(BountiesController);
    bountiesService = module.get<BountiesService>(BountiesService);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('claim', () => {
    const claimDto: ClaimBountyDto = { bountyId: 1 };
    const authWallet = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const mockResult = {
      id: 1,
      status: 'CLAIMED' as const,
      claimedAt: new Date(),
      txId: 'test-tx-id',
      walletAddress: authWallet,
    };

    it('should call service with claim DTO and auth wallet', async () => {
      mockBountiesService.claim.mockResolvedValue(mockResult);

      const result = await bountiesController.claim(claimDto, authWallet);

      expect(bountiesService.claim).toHaveBeenCalledWith(claimDto, authWallet);
      expect(result).toBe(mockResult);
    });
  });

  describe('linkWallet', () => {
    const linkDto: LinkWalletDto = {
      githubUsername: 'test-user',
      githubId: 12345678,
    };
    const authWallet = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

    it('should call authService.linkIdentity with wallet and GitHub info', async () => {
      mockAuthService.linkIdentity.mockResolvedValue({
        id: 1,
        wallet: authWallet,
        githubId: linkDto.githubId,
        username: linkDto.githubUsername,
      });

      const result = await bountiesController.linkWallet(linkDto, authWallet);

      expect(authService.linkIdentity).toHaveBeenCalledWith(authWallet, linkDto.githubUsername, linkDto.githubId);
      expect(result).toEqual({ message: 'Wallet linked successfully' });
    });
  });
});

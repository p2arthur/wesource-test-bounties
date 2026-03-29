import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let authService: AuthService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('linkIdentity', () => {
    const wallet = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const githubUsername = 'test-user';
    const githubId = 12345678;

    it('should upsert user with wallet, githubUsername, and githubId', async () => {
      const mockUser = {
        id: 1,
        wallet,
        username: githubUsername,
        githubId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.upsert.mockResolvedValue(mockUser);

      const result = await authService.linkIdentity(wallet, githubUsername, githubId);

      expect(prismaService.user.upsert).toHaveBeenCalledWith({
        where: { githubId },
        update: { username: githubUsername, wallet },
        create: { wallet, username: githubUsername, githubId },
      });

      expect(result).toBe(mockUser);
    });

    it('should handle username being null when creating', async () => {
      const mockUser = {
        id: 1,
        wallet,
        username: null,
        githubId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.upsert.mockResolvedValue(mockUser);

      const result = await authService.linkIdentity(wallet, null as any, githubId);

      expect(prismaService.user.upsert).toHaveBeenCalledWith({
        where: { githubId },
        update: { username: null, wallet },
        create: { wallet, username: null, githubId },
      });

      expect(result).toBe(mockUser);
    });
  });
});

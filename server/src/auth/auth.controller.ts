import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('api/users')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get(':walletAddress')
  @ApiOperation({
    summary: 'Get user profile by wallet address',
    description: 'Retrieves user profile information including bounties created and won.',
  })
  @ApiParam({
    name: 'walletAddress',
    description: 'Algorand wallet address',
    example: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HVY',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string' },
        wallet: { type: 'string' },
        bountiesCreated: { type: 'number' },
        bountiesWon: { type: 'number' },
        joinedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  getUserProfile(@Param('walletAddress') walletAddress: string) {
    return this.authService.getUserProfile(walletAddress);
  }
}

import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';

export class LoginDto {
  walletAddress: string;
  githubUsername: string;
  githubId: number;
}

@ApiTags('Auth')
@Controller('api')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('auth/login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Register wallet↔GitHub link at login time' })
  @ApiResponse({ status: 200, description: 'Identity linked successfully' })
  async login(@Body() dto: LoginDto) {
    await this.authService.linkIdentity(dto.walletAddress, dto.githubUsername, dto.githubId);
    return { success: true };
  }

  @Get('users/:walletAddress')
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

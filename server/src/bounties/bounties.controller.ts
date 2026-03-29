import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { BountiesService } from './bounties.service';
import { CreateBountyDto, BountyResponseDto, ClaimBountyDto, LinkWalletDto } from './dto';
import { AuthGuard, WalletAddress } from '../auth';
import { AuthService } from '../auth/auth.service';

@ApiTags('Bounties')
@Controller('api/bounties')
export class BountiesController {
  constructor(
    private readonly bountiesService: BountiesService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new bounty',
    description: 'Creates a new bounty record for a GitHub issue and stores it with OPEN status.',
  })
  @ApiBody({ type: CreateBountyDto })
  @ApiResponse({
    status: 201,
    description: 'Bounty created successfully',
    type: BountyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or invalid issue/repository',
  })
  @ApiResponse({
    status: 401,
    description: 'GitHub authentication failed or missing token',
  })
  @ApiResponse({
    status: 402,
    description: 'Payment required – send an X-PAYMENT header with a valid Algorand USDC payment',
  })
  create(@Body() createBountyDto: CreateBountyDto) {
    return this.bountiesService.create(createBountyDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List bounties with pagination',
    description: 'Returns paginated bounty records.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bounties fetched successfully',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/BountyResponseDto' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.max(1, parseInt(limit, 10)) : 20;
    return this.bountiesService.list(pageNum, limitNum);
  }

  @Get('winner/:username')
  @ApiOperation({
    summary: 'Get bounties won by a GitHub user',
    description: 'Returns all bounties that a specific GitHub user has won (status READY_FOR_CLAIM or CLAIMED).',
  })
  @ApiParam({
    name: 'username',
    description: 'GitHub username of the winner',
    example: 'octocat',
  })
  @ApiResponse({
    status: 200,
    description: 'Bounties fetched successfully',
    type: BountyResponseDto,
    isArray: true,
  })
  listByWinner(@Param('username') username: string) {
    return this.bountiesService.listByWinner(username);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single bounty by ID with winner details' })
  @ApiParam({ name: 'id', description: 'Bounty ID', type: Number })
  @ApiResponse({ status: 200, description: 'Bounty fetched successfully', type: BountyResponseDto })
  @ApiResponse({ status: 404, description: 'Bounty not found' })
  getById(@Param('id') id: string) {
    return this.bountiesService.getById(Number(id));
  }

  @Post('claim')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiSecurity('bearer')
  @ApiOperation({
    summary: 'Claim a bounty',
    description: 'Allows the winner of a bounty to claim their reward. Verifies GitHub identity and transfers funds on-chain.',
  })
  @ApiBody({ type: ClaimBountyDto })
  @ApiResponse({
    status: 200,
    description: 'Bounty claimed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bounty not ready for claim or invalid request',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not the winner of this bounty',
  })
  @ApiResponse({
    status: 404,
    description: 'Bounty not found',
  })
  @ApiResponse({
    status: 503,
    description: 'Blockchain service unavailable',
  })
  claim(@Body() claimBountyDto: ClaimBountyDto, @WalletAddress() wallet: string) {
    return this.bountiesService.claim(claimBountyDto, wallet);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reconcile database with on-chain state',
    description:
      'For each active (OPEN/READY_FOR_CLAIM) bounty in the database, computes its on-chain ID, ' +
      'looks it up in the smart contract box storage, and applies any status updates. ' +
      'Transitions: OPEN→CLAIMED (paid on-chain), OPEN→READY_FOR_CLAIM (winner set on-chain). ' +
      'Also reports value mismatches between DB and chain.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reconciliation completed',
    schema: {
      type: 'object',
      properties: {
        checked: { type: 'number', description: 'Active DB bounties evaluated' },
        claimedSynced: { type: 'number', description: 'Updated to CLAIMED (on-chain paid)' },
        readyForClaimSynced: { type: 'number', description: 'Updated to READY_FOR_CLAIM (winner set on-chain)' },
        notOnChain: { type: 'number', description: 'DB bounties with no matching on-chain box yet' },
        valueMismatches: {
          type: 'array',
          description: 'Bounties where DB amount differs from chain amount',
          items: {
            type: 'object',
            properties: {
              bountyId: { type: 'number' },
              dbAmountMicroAlgos: { type: 'number' },
              chainAmountMicroAlgos: { type: 'number' },
            },
          },
        },
        errors: { type: 'array', items: { type: 'string' }, description: 'Any errors encountered' },
      },
    },
  })
  sync() {
    return this.bountiesService.reconcileWithChain();
  }

  @Post('link-wallet')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiSecurity('bearer')
  @ApiOperation({
    summary: 'Link authenticated wallet to GitHub identity',
    description: 'Links the authenticated wallet address to a GitHub user identity for bounty claiming.',
  })
  @ApiBody({ type: LinkWalletDto })
  @ApiResponse({
    status: 200,
    description: 'Wallet linked successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
  })
  async linkWallet(@Body() dto: LinkWalletDto, @WalletAddress() wallet: string) {
    await this.authService.linkIdentity(wallet, dto.githubUsername, dto.githubId);
    return { message: 'Wallet linked successfully' };
  }

  @Post(':id/refund')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiSecurity('bearer')
  @ApiOperation({
    summary: 'Refund a bounty',
    description: 'Allows the creator to reclaim funds from a REFUNDABLE bounty.',
  })
  @ApiParam({
    name: 'id',
    description: 'Bounty ID',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Bounty refunded successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bounty not refundable or invalid request',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not the creator of this bounty',
  })
  @ApiResponse({
    status: 404,
    description: 'Bounty not found',
  })
  @ApiResponse({
    status: 503,
    description: 'Blockchain service unavailable',
  })
  async refund(@Param('id') id: string, @WalletAddress() wallet: string) {
    return this.bountiesService.refund(Number(id), wallet);
  }

  @Post(':id/revoke')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiSecurity('bearer')
  @ApiOperation({
    summary: 'Revoke a bounty',
    description: 'Allows the manager to reclaim funds from an expired bounty.',
  })
  @ApiParam({
    name: 'id',
    description: 'Bounty ID',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Bounty revoked successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bounty not eligible for revocation or invalid request',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not the manager',
  })
  @ApiResponse({
    status: 404,
    description: 'Bounty not found',
  })
  @ApiResponse({
    status: 503,
    description: 'Blockchain service unavailable',
  })
  async revoke(@Param('id') id: string, @WalletAddress() wallet: string) {
    return this.bountiesService.revoke(Number(id), wallet);
  }
}

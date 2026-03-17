import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BountiesService } from './bounties.service';
import { CreateBountyDto, BountyResponseDto, ClaimBountyDto } from './dto';

@ApiTags('Bounties')
@Controller('api/bounties')
export class BountiesController {
  constructor(private readonly bountiesService: BountiesService) {}

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
    summary: 'List bounties',
    description: 'Returns all bounty records.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bounties fetched successfully',
    type: BountyResponseDto,
    isArray: true,
  })
  list() {
    return this.bountiesService.list();
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

  @Post('claim')
  @HttpCode(HttpStatus.OK)
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
  claim(@Body() claimBountyDto: ClaimBountyDto) {
    return this.bountiesService.claim(claimBountyDto);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync bounties from on-chain state',
    description: 'Reads all bounty boxes from the smart contract and updates the database to match on-chain state.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sync completed successfully',
    schema: {
      type: 'object',
      properties: {
        checked: { type: 'number', description: 'Number of on-chain bounties checked' },
        updated: { type: 'number', description: 'Number of database records updated' },
        newOnChain: { type: 'number', description: 'Number of on-chain bounties not in database' },
        errors: { type: 'array', items: { type: 'string' }, description: 'Any errors encountered' },
      },
    },
  })
  sync() {
    return this.bountiesService.syncFromChain();
  }
}

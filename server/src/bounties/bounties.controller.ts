import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BountiesService } from './bounties.service';
import { CreateBountyDto, BountyResponseDto } from './dto';

@ApiTags('Bounties')
@Controller('api/bounties')
export class BountiesController {
  constructor(private readonly bountiesService: BountiesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new bounty',
    description:
      'Creates a new bounty record for a GitHub issue and stores it with OPEN status.',
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
}

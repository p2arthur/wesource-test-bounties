import { Controller, Get, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';

@ApiTags('Transactions')
@Controller('api/users')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get(':walletAddress/transactions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get transaction history for a user',
    description: 'Returns paginated transaction history (bounty events) for a wallet address.',
  })
  @ApiParam({
    name: 'walletAddress',
    description: 'Algorand wallet address',
    example: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HVY',
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number',
    required: false,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Results per page',
    required: false,
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction history retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              walletAddress: { type: 'string' },
              type: {
                type: 'string',
                enum: ['BOUNTY_CREATED', 'BOUNTY_CLAIMED', 'BOUNTY_REFUNDED', 'BOUNTY_REVOKED', 'BOUNTY_CANCELLED'],
              },
              bountyId: { type: 'number' },
              amount: { type: 'number', description: 'Amount in microAlgos' },
              createdAt: { type: 'string', format: 'date-time' },
              bounty: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  issueNumber: { type: 'number' },
                  issueUrl: { type: 'string' },
                  repository: {
                    type: 'object',
                    properties: {
                      githubUrl: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  getTransactions(
    @Param('walletAddress') walletAddress: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.max(1, parseInt(limit, 10)) : 20;
    return this.transactionsService.findByWallet(walletAddress, pageNum, limitNum);
  }
}

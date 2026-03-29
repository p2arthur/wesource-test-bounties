import { Controller, Get, Patch, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get notifications for a wallet with pagination',
    description: 'Returns paginated notifications for a user identified by wallet address.',
  })
  @ApiQuery({
    name: 'wallet',
    description: 'Algorand wallet address',
    required: true,
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
    description: 'Notifications retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              type: { type: 'string' },
              message: { type: 'string' },
              read: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              bounty: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'number' },
                  issueUrl: { type: 'string' },
                  amount: { type: 'number' },
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
  getNotifications(
    @Query('wallet') wallet: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.max(1, parseInt(limit, 10)) : 20;
    return this.notificationsService.getNotifications(wallet, pageNum, limitNum);
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread notification count',
    description: 'Returns the count of unread notifications for a wallet.',
  })
  @ApiQuery({
    name: 'wallet',
    description: 'Algorand wallet address',
    required: true,
    example: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HVY',
  })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        unreadCount: { type: 'number' },
      },
    },
  })
  getUnreadCount(@Query('wallet') wallet: string) {
    return this.notificationsService.getUnreadCount(wallet);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark notification as read',
    description: 'Marks a specific notification as read.',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        read: { type: 'boolean' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found',
  })
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markNotificationAsRead(parseInt(id, 10));
  }
}

import { Controller, Post, Get, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OracleService, OracleSyncReport } from './oracle.service';

@ApiTags('Oracle')
@Controller('oracle')
export class OracleController {
  private readonly logger = new Logger(OracleController.name);

  constructor(private readonly oracleService: OracleService) {}

  /**
   * Manually trigger Oracle validation
   * POST /oracle/validate
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger Oracle validation', description: 'Checks all open bounties against live GitHub issue state and updates statuses.' })
  @ApiResponse({ status: 200, description: 'Validation report returned' })
  async validateBounties(): Promise<OracleSyncReport> {
    this.logger.log('Manual Oracle validation triggered');
    return await this.oracleService.validateBounties();
  }

  /**
   * Get Oracle status/health check
   * GET /oracle/status
   */
  @Get('status')
  @ApiOperation({ summary: 'Oracle health check', description: 'Returns the operational status of the Oracle Validation Service.' })
  @ApiResponse({ status: 200, description: 'Service status' })
  getStatus() {
    return {
      service: 'Oracle Validation Service',
      status: 'operational',
      description: 'Syncs marketplace database with GitHub issue states',
      timestamp: new Date().toISOString(),
    };
  }
}

import { Controller, Post, Get, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { OracleService, OracleSyncReport } from './oracle.service';

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
  async validateBounties(): Promise<OracleSyncReport> {
    this.logger.log('Manual Oracle validation triggered');
    return await this.oracleService.validateBounties();
  }

  /**
   * Get Oracle status/health check
   * GET /oracle/status
   */
  @Get('status')
  getStatus() {
    return {
      service: 'Oracle Validation Service',
      status: 'operational',
      description: 'Syncs marketplace database with GitHub issue states',
      timestamp: new Date().toISOString(),
    };
  }
}

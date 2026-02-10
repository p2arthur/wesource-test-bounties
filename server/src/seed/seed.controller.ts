import { Controller, Post, Get, Logger } from '@nestjs/common';
import { SeedService, SEED_PROJECTS, KNOWN_BOUNTIES } from './seed.service';

@Controller('seed')
export class SeedController {
  private readonly logger = new Logger(SeedController.name);

  constructor(private readonly seedService: SeedService) {}

  /**
   * GET /seed/status
   * Returns the current seed configuration and database stats.
   */
  @Get('status')
  async getStatus() {
    return {
      seedProjects: SEED_PROJECTS.map((p) => ({
        name: p.name,
        category: p.category,
        repositories: p.repositories,
      })),
      knownBounties: KNOWN_BOUNTIES.length,
      message: 'Use POST /seed/sync to run the full sync.',
    };
  }

  /**
   * POST /seed/projects
   * Seeds the database with predefined projects.
   */
  @Post('projects')
  async seedProjects() {
    this.logger.log('Seeding projects...');
    const result = await this.seedService.seedProjects();
    return {
      success: true,
      ...result,
      message: `Created ${result.created} projects, ${result.existing} already existed.`,
    };
  }

  /**
   * POST /seed/bounties
   * Seeds known bounties from the predefined list.
   */
  @Post('bounties')
  async seedBounties() {
    this.logger.log('Seeding known bounties...');
    const result = await this.seedService.seedKnownBounties();
    return {
      success: true,
      ...result,
      message: `Created ${result.created} bounties, ${result.existing} already existed.`,
    };
  }

  /**
   * POST /seed/sync-onchain
   * Syncs bounties from on-chain state.
   */
  @Post('sync-onchain')
  async syncFromOnChain() {
    this.logger.log('Syncing from on-chain...');
    const result = await this.seedService.syncFromOnChain();
    return {
      success: result.errors.length === 0,
      ...result,
      message: `Updated ${result.bountiesUpdated} bounties from on-chain state.`,
    };
  }

  /**
   * POST /seed/enrich-github
   * Enriches bounties with GitHub data.
   */
  @Post('enrich-github')
  async enrichFromGitHub() {
    this.logger.log('Enriching from GitHub...');
    const result = await this.seedService.enrichFromGitHub();
    return {
      success: result.errors.length === 0,
      ...result,
      message: `Enriched ${result.updated} bounties from GitHub.`,
    };
  }

  /**
   * POST /seed/sync
   * Runs the full sync: seeds projects, syncs from on-chain, enriches from GitHub.
   */
  @Post('sync')
  async fullSync() {
    this.logger.log('Running full sync...');
    const result = await this.seedService.fullSync();
    return {
      success: true,
      ...result,
      message: 'Full sync completed successfully.',
    };
  }
}

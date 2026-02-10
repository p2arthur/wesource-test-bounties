import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GithubService } from '../github/github.service';
import { AlgorandService } from '../algorand/algorand.service';
import { BountyStatus } from '@prisma/client';
import { createHash } from 'crypto';

/**
 * Seed data for projects and repositories.
 * Add repositories here that have bounties on-chain.
 */
export interface SeedProject {
  name: string;
  description: string;
  category: string;
  creator: string;
  repositories: string[]; // GitHub URLs
}

export interface SeedBounty {
  repoOwner: string;
  repoName: string;
  issueNumber: number;
  creatorWallet: string;
}

/**
 * Known projects with repositories that may have bounties.
 * Extend this list with repositories you want to track.
 */
export const SEED_PROJECTS: SeedProject[] = [
  {
    name: 'AlgoKit Utils TypeScript',
    description: 'A set of core Algorand utilities written in TypeScript',
    category: 'Infrastructure',
    creator: 'algorandfoundation',
    repositories: ['https://github.com/algorandfoundation/algokit-utils-ts'],
  },
  {
    name: 'Puya TypeScript',
    description: 'Algorand TypeScript smart contract language',
    category: 'Smart Contracts',
    creator: 'algorandfoundation',
    repositories: ['https://github.com/algorandfoundation/puya-ts'],
  },
  {
    name: 'AlgoKit CLI',
    description: 'The Algorand AlgoKit CLI',
    category: 'Developer Tools',
    creator: 'algorandfoundation',
    repositories: ['https://github.com/algorandfoundation/algokit-cli'],
  },
];

/**
 * Known bounties that exist on-chain.
 * When a bounty exists on-chain but we can't reverse the hash,
 * add the bounty info here to enable sync.
 */
export const KNOWN_BOUNTIES: SeedBounty[] = [
  // Example: Add known bounties here
  // { repoOwner: 'algorandfoundation', repoName: 'algokit-utils-ts', issueNumber: 123, creatorWallet: 'ABC...' },
];

export interface SyncResult {
  projectsCreated: number;
  repositoriesCreated: number;
  bountiesCreated: number;
  bountiesUpdated: number;
  errors: string[];
}

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly githubService: GithubService,
    private readonly algorandService: AlgorandService,
  ) {}

  /**
   * Seeds the database with predefined projects and repositories.
   */
  async seedProjects(): Promise<{ created: number; existing: number }> {
    let created = 0;
    let existing = 0;

    for (const seedProject of SEED_PROJECTS) {
      try {
        // Check if project already exists by name
        const existingProject = await this.prisma.project.findFirst({
          where: { name: seedProject.name },
        });

        if (existingProject) {
          this.logger.log(`Project "${seedProject.name}" already exists, skipping.`);
          existing++;
          continue;
        }

        // Create project and repositories in a transaction
        await this.prisma.$transaction(async (tx) => {
          const project = await tx.project.create({
            data: {
              name: seedProject.name,
              description: seedProject.description,
              category: seedProject.category,
              creator: seedProject.creator,
            },
          });

          for (const repoUrl of seedProject.repositories) {
            // Check if repository URL already exists
            const existingRepo = await tx.repository.findUnique({
              where: { githubUrl: repoUrl },
            });

            if (!existingRepo) {
              await tx.repository.create({
                data: {
                  githubUrl: repoUrl,
                  projectId: project.id,
                },
              });
            }
          }

          this.logger.log(`Created project "${seedProject.name}" with ${seedProject.repositories.length} repositories.`);
        });

        created++;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to seed project "${seedProject.name}": ${message}`);
      }
    }

    return { created, existing };
  }

  /**
   * Seeds known bounties from the KNOWN_BOUNTIES list.
   */
  async seedKnownBounties(): Promise<{ created: number; existing: number }> {
    let created = 0;
    let existing = 0;

    for (const bounty of KNOWN_BOUNTIES) {
      try {
        const issueUrl = `https://github.com/${bounty.repoOwner}/${bounty.repoName}/issues/${bounty.issueNumber}`;

        // Check if bounty already exists
        const existingBounty = await this.prisma.bounty.findUnique({
          where: { issueUrl },
        });

        if (existingBounty) {
          existing++;
          continue;
        }

        // Find the repository
        const repoUrl = `https://github.com/${bounty.repoOwner}/${bounty.repoName}`;
        const repository = await this.prisma.repository.findFirst({
          where: { githubUrl: { contains: `${bounty.repoOwner}/${bounty.repoName}` } },
        });

        if (!repository) {
          this.logger.warn(`Repository not found for bounty: ${repoUrl}`);
          continue;
        }

        // Compute bounty key
        const bountyKey = this.buildBountyKey(bounty.repoOwner, bounty.repoName, bounty.issueNumber);

        // Get on-chain data if available
        const bountyId = this.computeBountyId(bounty.repoOwner, bounty.repoName, bounty.issueNumber);
        const onChainBounty = await this.algorandService.getOnChainBounty(bountyId);

        await this.prisma.bounty.create({
          data: {
            issueNumber: bounty.issueNumber,
            issueUrl,
            bountyKey,
            amount: onChainBounty ? Number(onChainBounty.totalValue) / 1_000_000 : 0, // Convert microAlgos to Algos
            status: onChainBounty?.isPaid ? 'CLAIMED' : 'OPEN',
            creatorWallet: bounty.creatorWallet,
            repositoryId: repository.id,
            githubIssueId: BigInt(0),
          },
        });

        created++;
        this.logger.log(`Created bounty for ${bounty.repoOwner}/${bounty.repoName}#${bounty.issueNumber}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to seed bounty: ${message}`);
      }
    }

    return { created, existing };
  }

  /**
   * Syncs on-chain bounties with the database.
   * Matches on-chain bounties to database bounties by computing bounty IDs.
   * Updates amounts and statuses based on on-chain state.
   */
  async syncFromOnChain(): Promise<SyncResult> {
    const result: SyncResult = {
      projectsCreated: 0,
      repositoriesCreated: 0,
      bountiesCreated: 0,
      bountiesUpdated: 0,
      errors: [],
    };

    if (!this.algorandService.isReadConfigured()) {
      this.logger.warn('Algorand service not configured for reading. Cannot sync from on-chain.');
      result.errors.push('Algorand service not configured');
      return result;
    }

    try {
      // Fetch all on-chain bounties
      const onChainBounties = await this.algorandService.getOnChainBounties();
      this.logger.log(`Found ${onChainBounties.length} bounties on-chain.`);

      // Fetch all database bounties with repository info
      const dbBounties = await this.prisma.bounty.findMany({
        include: { repository: { select: { githubUrl: true } } },
      });

      // Create a map of computed bounty ID -> DB bounty
      const dbBountyMap = new Map<string, (typeof dbBounties)[0]>();
      for (const bounty of dbBounties) {
        const repoInfo = this.githubService.parseGithubUrl(bounty.repository.githubUrl);
        if (repoInfo) {
          const bountyId = this.computeBountyId(repoInfo.owner, repoInfo.repo, bounty.issueNumber);
          dbBountyMap.set(bountyId.toString(), bounty);
        }
      }

      // Sync each on-chain bounty
      for (const onChainBounty of onChainBounties) {
        const dbBounty = dbBountyMap.get(onChainBounty.bountyId.toString());

        if (!dbBounty) {
          // On-chain bounty not in DB - we can't create it without repo info
          // Log for debugging
          this.logger.debug(`On-chain bounty ${onChainBounty.bountyId} not matched to any DB bounty.`);
          continue;
        }

        // Update amount if different
        const onChainAmount = Number(onChainBounty.totalValue) / 1_000_000; // microAlgos to Algos
        const needsAmountUpdate = Math.abs(dbBounty.amount - onChainAmount) > 0.000001;

        // Determine new status based on on-chain state
        let newStatus: BountyStatus = dbBounty.status;
        if (onChainBounty.isPaid && dbBounty.status !== 'CLAIMED') {
          newStatus = 'CLAIMED';
        }

        if (needsAmountUpdate || newStatus !== dbBounty.status) {
          await this.prisma.bounty.update({
            where: { id: dbBounty.id },
            data: {
              amount: onChainAmount,
              status: newStatus,
              claimedAt: newStatus === 'CLAIMED' && !dbBounty.claimedAt ? new Date() : dbBounty.claimedAt,
            },
          });

          result.bountiesUpdated++;
          this.logger.log(`Updated bounty ${dbBounty.id}: amount=${onChainAmount}, status=${newStatus}`);
        }
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to sync from on-chain: ${message}`);
      result.errors.push(message);
      return result;
    }
  }

  /**
   * Enriches bounties with GitHub issue data.
   * Fetches issue title and GitHub issue ID from the GitHub API.
   */
  async enrichFromGitHub(): Promise<{ updated: number; errors: string[] }> {
    const result = {
      updated: 0,
      errors: [] as string[],
    };

    try {
      // Get bounties that need enrichment (githubIssueId is 0)
      const bounties = await this.prisma.bounty.findMany({
        where: { githubIssueId: BigInt(0) },
        include: { repository: { select: { githubUrl: true } } },
      });

      this.logger.log(`Enriching ${bounties.length} bounties from GitHub...`);

      for (const bounty of bounties) {
        try {
          const repoInfo = this.githubService.parseGithubUrl(bounty.repository.githubUrl);
          if (!repoInfo) {
            continue;
          }

          // Fetch issue closure info to get the GitHub issue ID
          const issueInfo = await this.githubService.getIssueClosureInfo({
            owner: repoInfo.owner,
            repo: repoInfo.repo,
            issueNumber: bounty.issueNumber,
          });

          // Extract numeric ID from GraphQL global ID (format: R_kgDO...)
          // For now, we'll use the issue number as a placeholder
          await this.prisma.bounty.update({
            where: { id: bounty.id },
            data: {
              githubIssueId: BigInt(bounty.issueNumber), // Use issue number if we can't get GitHub ID
            },
          });

          result.updated++;

          // Add delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Bounty ${bounty.id}: ${message}`);
        }
      }

      this.logger.log(`Enriched ${result.updated} bounties from GitHub.`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(message);
      return result;
    }
  }

  /**
   * Full sync: seeds projects, syncs from on-chain, and enriches from GitHub.
   */
  async fullSync(): Promise<{
    projects: { created: number; existing: number };
    knownBounties: { created: number; existing: number };
    onChainSync: SyncResult;
    githubEnrich: { updated: number; errors: string[] };
  }> {
    this.logger.log('Starting full database sync...');

    // 1. Seed projects
    const projects = await this.seedProjects();
    this.logger.log(`Projects: ${projects.created} created, ${projects.existing} existing`);

    // 2. Seed known bounties
    const knownBounties = await this.seedKnownBounties();
    this.logger.log(`Known bounties: ${knownBounties.created} created, ${knownBounties.existing} existing`);

    // 3. Sync from on-chain
    const onChainSync = await this.syncFromOnChain();
    this.logger.log(`On-chain sync: ${onChainSync.bountiesUpdated} updated`);

    // 4. Enrich from GitHub
    const githubEnrich = await this.enrichFromGitHub();
    this.logger.log(`GitHub enrich: ${githubEnrich.updated} updated`);

    this.logger.log('Full sync complete!');

    return {
      projects,
      knownBounties,
      onChainSync,
      githubEnrich,
    };
  }

  /**
   * Computes the deterministic bounty ID from repo info (same algorithm as contract)
   */
  private computeBountyId(repoOwner: string, repoName: string, issueNumber: number): bigint {
    const canonicalOwner = repoOwner.trim().toLowerCase();
    const canonicalRepo = repoName.trim().toLowerCase();
    const canonicalIssueNumber = Number(issueNumber);
    const canonical = `${canonicalOwner}|${canonicalRepo}|${canonicalIssueNumber}`;

    let hash = BigInt(5381);
    for (let i = 0; i < canonical.length; i++) {
      hash = ((hash << BigInt(5)) + hash) ^ BigInt(canonical.charCodeAt(i));
      hash = hash & BigInt('0xFFFFFFFFFFFFFFFF');
    }
    return hash;
  }

  /**
   * Builds the bounty key for database storage (SHA-256 hash)
   */
  private buildBountyKey(repoOwner: string, repoName: string, issueNumber: number): string {
    const canonicalOwner = repoOwner.trim().toLowerCase();
    const canonicalRepo = repoName.trim().toLowerCase();
    const canonicalIssueNumber = Number(issueNumber);
    const canonical = `${canonicalOwner}|${canonicalRepo}|${canonicalIssueNumber}`;
    return createHash('sha256').update(canonical, 'utf8').digest('hex');
  }
}

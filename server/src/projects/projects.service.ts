import { Injectable, Logger, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GithubService } from '../github/github.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly githubService: GithubService,
  ) {}

  /**
   * Create a new project with repository URLs
   * Only stores project info and repo URLs - no GitHub data is saved
   */
  async create(createProjectDto: CreateProjectDto) {
    const { name, description, category, creator, repoUrls } = createProjectDto;

    // Validate all GitHub URLs before saving
    this.logger.log(`Validating ${repoUrls.length} repository URLs`);

    for (const url of repoUrls) {
      const parsed = this.githubService.parseGithubUrl(url);
      if (!parsed) {
        throw new HttpException(`Invalid GitHub URL: ${url}. Expected format: https://github.com/owner/repo`, HttpStatus.BAD_REQUEST);
      }
    }

    // Use a transaction to create project and repositories
    const project = await this.prisma.$transaction(async (tx) => {
      // Create the project
      const newProject = await tx.project.create({
        data: {
          name,
          description,
          category,
          creator,
        },
      });

      // Create repository entries for each URL
      for (const url of repoUrls) {
        await tx.repository.create({
          data: {
            githubUrl: url,
            projectId: newProject.id,
          },
        });
      }

      // Return the complete project with repositories
      return tx.project.findUnique({
        where: { id: newProject.id },
        include: {
          repositories: true,
        },
      });
    });

    return project;
  }

  /**
   * Get all projects with their repository URLs (no GitHub data)
   */
  async findAll() {
    const projects = await this.prisma.project.findMany({
      include: {
        repositories: {
          select: {
            id: true,
            githubUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      data: projects,
      total: projects.length,
    };
  }

  /**
   * Get a single project by ID with full GitHub data (contributors + issues)
   * Fetches live data from GitHub API
   */
  async findOne(id: number) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        repositories: true,
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    // Fetch GitHub data for all repositories in parallel
    this.logger.log(`Fetching GitHub data for ${project.repositories.length} repositories`);

    const enrichedRepos = await Promise.all(
      project.repositories.map(async (repo) => {
        try {
          const githubData = await this.githubService.getFullRepositoryData(repo.githubUrl);
          return {
            id: repo.id,
            githubUrl: repo.githubUrl,
            name: githubData.name,
            description: githubData.description,
            stars: githubData.stars,
            contributors: githubData.contributors,
            issues: githubData.issues,
          };
        } catch (error) {
          // If GitHub fetch fails, return basic info with defaults so the client
          // always receives a consistent shape (name, stars, etc.)
          this.logger.warn(`Failed to fetch GitHub data for ${repo.githubUrl}: ${error.message}`);
          const fallbackName = repo.githubUrl.split('/').filter(Boolean).pop() || 'unknown';
          return {
            id: repo.id,
            githubUrl: repo.githubUrl,
            name: fallbackName,
            description: null,
            stars: 0,
            contributors: [],
            issues: [],
            error: `Failed to fetch data: ${error.message}`,
          };
        }
      }),
    );

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      category: project.category,
      creator: project.creator,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      repositories: enrichedRepos,
    };
  }

  /**
   * Delete a project by ID
   */
  async remove(id: number) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    await this.prisma.project.delete({
      where: { id },
    });

    return { message: `Project with ID ${id} successfully deleted` };
  }
}

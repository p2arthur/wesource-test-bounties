import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import {
  ProjectResponseDto,
  ProjectListResponseDto,
} from './dto/project-response.dto';

@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new project',
    description:
      'Creates a new project by providing a name, creator, and GitHub repository URLs. Only the project metadata and repo URLs are stored. GitHub data is fetched dynamically when the project is retrieved.',
  })
  @ApiBody({ type: CreateProjectDto })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid GitHub URL or validation error',
  })
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all projects with pagination',
    description:
      'Returns a paginated list of all projects with their associated repositories.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of projects retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/ProjectResponseDto' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.max(1, parseInt(limit, 10)) : 20;
    return this.projectsService.findAll(pageNum, limitNum);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get project by ID',
    description:
      'Returns full details of a specific project including contributors and issues fetched live from GitHub API.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Project ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Project retrieved successfully with live GitHub data',
    type: ProjectResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  @ApiResponse({
    status: 429,
    description: 'GitHub API rate limit exceeded',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a project',
    description:
      'Deletes a project and all its associated repositories and contributor links.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Project ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Project deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.remove(id);
  }
}

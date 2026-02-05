import { ApiProperty } from '@nestjs/swagger';

export class ContributorResponseDto {
  @ApiProperty({ example: 'octocat' })
  githubHandle: string;

  @ApiProperty({ example: 'https://avatars.githubusercontent.com/u/583231?v=4' })
  avatarUrl: string;
}

export class LabelDto {
  @ApiProperty({ example: 'bug' })
  name: string;

  @ApiProperty({ example: 'd73a4a' })
  color: string;
}

export class IssueUserDto {
  @ApiProperty({ example: 'octocat' })
  login: string;

  @ApiProperty({ example: 'https://avatars.githubusercontent.com/u/583231?v=4' })
  avatarUrl: string;
}

export class IssueResponseDto {
  @ApiProperty({ example: 123456789 })
  id: number;

  @ApiProperty({ example: 42 })
  number: number;

  @ApiProperty({ example: 'Fix authentication bug' })
  title: string;

  @ApiProperty({ example: 'open', enum: ['open', 'closed'] })
  state: string;

  @ApiProperty({ example: '2026-01-20T10:30:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-01-20T10:30:00.000Z' })
  updatedAt: string;

  @ApiProperty({ example: 'https://github.com/owner/repo/issues/42' })
  htmlUrl: string;

  @ApiProperty({ type: IssueUserDto })
  user: IssueUserDto;

  @ApiProperty({ type: [LabelDto] })
  labels: LabelDto[];
}

export class RepositoryResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'https://github.com/nestjs/nest' })
  githubUrl: string;

  @ApiProperty({ example: 'nest', description: 'Fetched from GitHub API' })
  name?: string;

  @ApiProperty({ example: 65000, description: 'Fetched from GitHub API' })
  stars?: number;

  @ApiProperty({
    example: 'A progressive Node.js framework',
    nullable: true,
    description: 'Fetched from GitHub API',
  })
  description?: string | null;

  @ApiProperty({ type: [ContributorResponseDto], description: 'Fetched from GitHub API' })
  contributors?: ContributorResponseDto[];

  @ApiProperty({ type: [IssueResponseDto], description: 'Fetched from GitHub API' })
  issues?: IssueResponseDto[];
}

export class ProjectResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'My Awesome Project' })
  name: string;
  @ApiProperty({ example: 'A collection of tools for web development', nullable: true })
  description: string | null;

  @ApiProperty({ example: 'Web Development' })
  category: string;
  @ApiProperty({ example: 'John Doe' })
  creator: string;

  @ApiProperty({ example: '2026-01-20T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-20T10:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ type: [RepositoryResponseDto] })
  repositories: RepositoryResponseDto[];
}

export class ProjectListResponseDto {
  @ApiProperty({ type: [ProjectResponseDto] })
  data: ProjectResponseDto[];

  @ApiProperty({ example: 10 })
  total: number;
}

import { ApiProperty } from '@nestjs/swagger';

export class BountyResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({
    example: '4e9f8e8d2a8d9dd5e1b0a7f67c1b2a9d3b8e4d5f6a7b8c9d0e1f2a3b4c5d6e7f',
  })
  bountyKey: string;

  @ApiProperty({ example: 'octocat' })
  repoOwner: string;

  @ApiProperty({ example: 'hello-world' })
  repoName: string;

  @ApiProperty({ example: 123 })
  issueNumber: number;

  @ApiProperty({ example: 'https://github.com/octocat/hello-world/issues/123' })
  issueUrl: string;

  @ApiProperty({ example: 250 })
  amount: number;

  @ApiProperty({ example: '0x1234...abcd' })
  creatorWallet: string;

  @ApiProperty({ example: 'OPEN' })
  status: string;

  @ApiProperty({ example: 42, nullable: true })
  winnerId: number | null;

  @ApiProperty({ example: '2026-01-24T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-01-24T12:00:00.000Z' })
  updatedAt: string;
}

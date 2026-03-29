import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class LinkWalletDto {
  @ApiProperty({
    description: 'The GitHub username to link to the authenticated wallet',
    example: 'octocat',
  })
  @IsString()
  @IsNotEmpty()
  githubUsername: string;

  @ApiProperty({
    description: 'The GitHub ID of the user to link',
    example: 12345678,
  })
  @IsInt()
  @Min(1)
  githubId: number;
}

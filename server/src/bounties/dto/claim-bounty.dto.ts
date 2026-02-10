import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class ClaimBountyDto {
  @ApiProperty({
    description: 'The ID of the bounty to claim',
    example: 1,
  })
  @IsInt()
  @Min(1)
  bountyId: number;

  @ApiProperty({
    description: 'The GitHub ID of the user claiming the bounty',
    example: 12345678,
  })
  @IsInt()
  @Min(1)
  githubId: number;

  @ApiProperty({
    description: 'The Algorand wallet address to receive the bounty',
    example: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  })
  @IsString()
  @IsNotEmpty()
  walletAddress: string;
}

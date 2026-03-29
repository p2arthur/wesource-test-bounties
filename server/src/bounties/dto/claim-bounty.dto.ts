import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class ClaimBountyDto {
  @ApiProperty({
    description: 'The ID of the bounty to claim',
    example: 1,
  })
  @IsInt()
  @Min(1)
  bountyId: number;

  @ApiProperty({
    description: 'The Algorand wallet address of the claimer',
    example: 'ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890',
  })
  @IsString()
  walletAddress: string;
}

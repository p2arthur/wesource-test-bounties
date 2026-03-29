import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class ClaimBountyDto {
  @ApiProperty({
    description: 'The ID of the bounty to claim',
    example: 1,
  })
  @IsInt()
  @Min(1)
  bountyId: number;
}

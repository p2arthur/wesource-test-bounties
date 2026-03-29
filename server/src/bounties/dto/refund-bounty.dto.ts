import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

export class RefundBountyDto {
  @ApiProperty({
    description: 'The ID of the bounty to refund',
    example: 1,
  })
  @IsNumber()
  @IsPositive()
  bountyId: number;
}

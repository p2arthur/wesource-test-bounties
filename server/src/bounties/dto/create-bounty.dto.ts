import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class CreateBountyDto {
  @ApiProperty({ example: 'octocat' })
  @IsString()
  @IsNotEmpty()
  repoOwner: string;

  @ApiProperty({ example: 'hello-world' })
  @IsString()
  @IsNotEmpty()
  repoName: string;

  @ApiProperty({ example: 123 })
  @IsInt()
  @IsPositive()
  issueNumber: number;

  @ApiProperty({ example: 250 })
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  amount: number;

  @ApiProperty({ example: '0x1234...abcd' })
  @IsString()
  @IsNotEmpty()
  creatorWallet: string;
}

import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  ArrayNotEmpty,
  IsUrl,
  IsOptional,
} from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({
    description: 'Name of the project',
    example: 'My Awesome Project',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Description of the project',
    example: 'A collection of tools for web development',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Category of the project',
    example: 'Web Development',
  })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({
    description: 'Creator/author of the project',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  creator: string;

  @ApiProperty({
    description: 'Array of GitHub repository URLs',
    example: [
      'https://github.com/nestjs/nest',
      'https://github.com/prisma/prisma',
    ],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUrl({}, { each: true })
  repoUrls: string[];
}

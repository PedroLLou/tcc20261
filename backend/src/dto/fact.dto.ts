import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFactDto {
  @IsString()
  @MaxLength(5000)
  description: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  sessionId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  relatedUserId?: number;
}

export class FactQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize = 20;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  relatedUserId?: number;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class SelectFactsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(100, { each: true })
  factIds: number[];
}

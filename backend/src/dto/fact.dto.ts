import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
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

import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsISO8601,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateFeedbackProcessDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  objective: string;

  @IsInt()
  @Min(1)
  participantId: number;

  @IsOptional()
  @IsISO8601()
  startsAt?: string | null;

  @IsOptional()
  @IsISO8601()
  endsAt?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  criteria?: string[];
}

export class UpdateFeedbackProcessDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  objective?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  participantId?: number;

  @IsOptional()
  @IsISO8601()
  startsAt?: string | null;

  @IsOptional()
  @IsISO8601()
  endsAt?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  criteria?: string[];
}

export class FeedbackProcessObservationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  observation: string;
}

import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class CreateFeedbackSessionDto {
  @IsInt()
  @Min(1)
  processId: number;
}

export class DefineFeedbackSessionObjectiveDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  objective: string;
}

import { IsInt, Min } from 'class-validator';

export class CreateFeedbackSessionDto {
  @IsInt()
  @Min(1)
  processId: number;
}

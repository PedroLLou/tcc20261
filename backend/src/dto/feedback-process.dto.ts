export class CreateFeedbackProcessDto {
  description?: string | null;
  objective: string;
  participantId: number;
  startsAt?: string | null;
  endsAt?: string | null;
  criteria?: string[];
}

export class UpdateFeedbackProcessDto {
  description?: string | null;
  objective?: string;
  participantId?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  criteria?: string[];
}

export class FeedbackProcessObservationDto {
  observation: string;
}
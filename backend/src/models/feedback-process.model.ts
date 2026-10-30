export type FeedbackProcessStatus = 'DRAFT' | 'SENT_FOR_VALIDATION' | 'PLANNED';

export interface FeedbackProcessParticipant {
  id: number;
  name: string;
  email: string;
}

export interface FeedbackProcess {
  id: number;
  description: string | null;
  objective: string;
  startsAt: Date | null;
  endsAt: Date | null;
  criteria: string[];
  observation: string | null;
  status: FeedbackProcessStatus;
  ownerId: number;
  participantId: number | null;
  participant: FeedbackProcessParticipant | null;
  createdAt: Date;
  updatedAt: Date;
}

export type FeedbackProcessSummary = Pick<
  FeedbackProcess,
  'id' | 'objective' | 'status' | 'ownerId' | 'participantId'
>;

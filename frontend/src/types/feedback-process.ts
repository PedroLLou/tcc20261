export type FeedbackProcessStatus =
  | 'DRAFT'
  | 'SENT_FOR_VALIDATION'
  | 'PLANNED';

import type { TeamMember } from './team-member';

export interface FeedbackProcess {
  id: number;
  description: string | null;
  objective: string;
  startsAt: string | null;
  endsAt: string | null;
  criteria: string[];
  observation: string | null;
  status: FeedbackProcessStatus;
  ownerId: number;
  participantId: number | null;
  participant: TeamMember | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackProcessFields {
  description?: string;
  objective: string;
  participantId: number;
  startsAt?: string | null;
  endsAt?: string | null;
  criteria?: string[];
}

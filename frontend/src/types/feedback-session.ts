export interface FeedbackSession {
  id: number;
  processId: number;
  objective: string | null;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

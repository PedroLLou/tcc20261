export interface FeedbackSession {
  id: number;
  processId: number;
  objective: string | null;
  scheduledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

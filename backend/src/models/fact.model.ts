export interface FactAttachment {
  id: number;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

export interface Fact {
  id: number;
  authorId: number;
  sessionId: number | null;
  relatedUserId: number | null;
  description: string;
  recordedAt: Date;
  attachments: FactAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

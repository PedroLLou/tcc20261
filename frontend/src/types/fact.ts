export interface FactAttachment {
  id: number;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface Fact {
  id: number;
  authorId: number;
  sessionId: number | null;
  relatedUserId: number | null;
  description: string;
  recordedAt: string;
  attachments: FactAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface AvailableFactsPage {
  items: Fact[];
  total: number;
  page: number;
  pageSize: number;
}

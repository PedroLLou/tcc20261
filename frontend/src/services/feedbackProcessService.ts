import api from './api';

export interface CreateFeedbackProcessRequest {
  title: string;
  description?: string;
}

export interface FeedbackProcess {
  id: number;
  title: string;
  description: string | null;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
}

class FeedbackProcessService {
  async create(data: CreateFeedbackProcessRequest): Promise<FeedbackProcess> {
    const response = await api.post<FeedbackProcess>('/feedback-processes', data);
    return response.data;
  }
}

export default new FeedbackProcessService();
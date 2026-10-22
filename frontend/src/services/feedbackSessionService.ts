import api from './api';
import type { FeedbackSession } from '../types/feedback-session';

class FeedbackSessionService {
  async create(processId: number): Promise<FeedbackSession> {
    const response = await api.post<FeedbackSession>('/feedback-sessions', {
      processId,
    });
    return response.data;
  }
}

export default new FeedbackSessionService();

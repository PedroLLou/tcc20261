import api from './api';
import type { FeedbackSession } from '../types/feedback-session';

class FeedbackSessionService {
  async create(processId: number): Promise<FeedbackSession> {
    const response = await api.post<FeedbackSession>('/feedback-sessions', {
      processId,
    });
    return response.data;
  }

  async defineObjective(id: number, objective: string): Promise<FeedbackSession> {
    const response = await api.patch<FeedbackSession>(
      `/feedback-sessions/${id}/objective`,
      { objective },
    );
    return response.data;
  }

  async defineSchedule(id: number, scheduledAt: string): Promise<FeedbackSession> {
    const response = await api.patch<FeedbackSession>(
      `/feedback-sessions/${id}/schedule`,
      { scheduledAt },
    );
    return response.data;
  }
}

export default new FeedbackSessionService();

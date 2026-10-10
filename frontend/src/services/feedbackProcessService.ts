import api from './api';
import type {
  FeedbackProcess,
  FeedbackProcessFields,
} from '../types/feedback-process';
import type { TeamMember } from '../types/team-member';
export type {
  FeedbackProcess,
  FeedbackProcessFields,
  FeedbackProcessStatus,
} from '../types/feedback-process';

export type CreateFeedbackProcessRequest = FeedbackProcessFields;

class FeedbackProcessService {
  async create(data: CreateFeedbackProcessRequest): Promise<FeedbackProcess> {
    const response = await api.post<FeedbackProcess>('/feedback-processes', data);
    return response.data;
  }

  async update(
    id: number,
    data: FeedbackProcessFields,
  ): Promise<FeedbackProcess> {
    const response = await api.patch<FeedbackProcess>(`/feedback-processes/${id}`, data);
    return response.data;
  }

  async submitForValidation(id: number): Promise<FeedbackProcess> {
    const response = await api.post<FeedbackProcess>(
      `/feedback-processes/${id}/submit`,
    );
    return response.data;
  }

  async approve(id: number): Promise<FeedbackProcess> {
    const response = await api.post<FeedbackProcess>(
      `/feedback-processes/${id}/approve`,
    );
    return response.data;
  }

  async registerObservation(id: number, observation: string): Promise<FeedbackProcess> {
    const response = await api.post<FeedbackProcess>(
      `/feedback-processes/${id}/observation`,
      { observation },
    );
    return response.data;
  }

  async requestAdjustments(id: number, observation: string): Promise<FeedbackProcess> {
    const response = await api.post<FeedbackProcess>(
      `/feedback-processes/${id}/request-adjustments`,
      { observation },
    );
    return response.data;
  }

  async remove(id: number): Promise<void> {
    await api.delete(`/feedback-processes/${id}`);
  }

  async list(): Promise<FeedbackProcess[]> {
    const response = await api.get<FeedbackProcess[]>('/feedback-processes');
    return response.data;
  }

  async listParticipants(): Promise<TeamMember[]> {
    const response = await api.get<TeamMember[]>('/feedback-processes/participants');
    return response.data;
  }
}

export default new FeedbackProcessService();
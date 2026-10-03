import api from './api';

export type FeedbackProcessStatus =
  | 'DRAFT'
  | 'SENT_FOR_VALIDATION'
  | 'PLANNED';

export interface FeedbackProcessFields {
  description?: string;
  objective: string;
  participantId: number;
  startsAt?: string | null;
  endsAt?: string | null;
  criteria?: string[];
}

export type CreateFeedbackProcessRequest = FeedbackProcessFields;

export interface TeamMember {
  id: number;
  name: string;
  email: string;
}

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
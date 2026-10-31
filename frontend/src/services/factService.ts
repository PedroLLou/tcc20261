import api from "./api";
import type { AvailableFactsPage, Fact } from "../types/fact";

class FactService {
  async create(
    description: string,
    relatedUserId: number | null,
    files: File[],
  ): Promise<Fact> {
    const formData = new FormData();
    formData.append("description", description);
    if (relatedUserId !== null) {
      formData.append("relatedUserId", String(relatedUserId));
    }
    files.forEach((file) => formData.append("files", file));

    const response = await api.post<Fact>("/facts", formData);
    return response.data;
  }

  async listAvailable(page = 1, pageSize = 20): Promise<AvailableFactsPage> {
    const response = await api.get<AvailableFactsPage>("/facts/available", {
      params: { page, pageSize },
    });
    return response.data;
  }

  async listAvailableForSession(
    sessionId: number,
    page = 1,
    pageSize = 20,
  ): Promise<AvailableFactsPage> {
    const response = await api.get<AvailableFactsPage>(
      `/feedback-sessions/${sessionId}/facts/available`,
      { params: { page, pageSize } },
    );
    return response.data;
  }

  async selectForSession(
    sessionId: number,
    factIds: number[],
  ): Promise<Fact[]> {
    const response = await api.post<Fact[]>(
      `/feedback-sessions/${sessionId}/facts`,
      { factIds },
    );
    return response.data;
  }
}

export default new FactService();

import api from './api';
import type { Fact } from '../types/fact';

class FactService {
  async create(
    description: string,
    relatedUserId: number | null,
    files: File[],
  ): Promise<Fact> {
    const formData = new FormData();
    formData.append('description', description);
    if (relatedUserId !== null) {
      formData.append('relatedUserId', String(relatedUserId));
    }
    files.forEach((file) => formData.append('files', file));

    const response = await api.post<Fact>('/facts', formData);
    return response.data;
  }
}

export default new FactService();

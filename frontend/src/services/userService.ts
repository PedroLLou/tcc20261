import api from "./api";
import type { TeamMember } from "../types/team-member";

class UserService {
  async listAvailableForFacts(): Promise<TeamMember[]> {
    const response = await api.get<TeamMember[]>("/users/available-for-facts");
    return response.data;
  }
}

export default new UserService();

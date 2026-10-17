export type UserRole = 'ADMIN_LEADER' | 'TEAM_MEMBER' | 'ADMIN_RH';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  access_token: string;
}

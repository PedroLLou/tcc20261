export type UserRole = 'TEAM_MEMBER' | 'ADMIN_LEADER' | 'ADMIN_RH';

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}

/**
 * Domain representation of a user. Credentials are intentionally excluded
 * from the domain object returned to the application layer.
 */
export interface User extends AuthenticatedUser {
  age: number;
  teamId: number | null;
}

export interface UserCredentials extends User {
  password: string;
}

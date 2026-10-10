import type { UserRole } from './user';

export interface ManagedUser {
  id: number;
  name: string;
  age: number;
  email: string;
  role: UserRole;
  teamId: number | null;
  team: { id: number; name: string } | null;
}

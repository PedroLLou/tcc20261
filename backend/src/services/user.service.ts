import { Injectable } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class UserService {
  constructor(private readonly users: UserRepository) {}

  listAvailableForFacts() {
    return this.users.listParticipants();
  }
}

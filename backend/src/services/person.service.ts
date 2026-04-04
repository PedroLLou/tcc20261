import { Injectable } from '@nestjs/common';
import { PersonRepository } from '../repositories/person.repository';
import { PersonDto } from '../dto/person.dto';

@Injectable()
export class PersonService {
  constructor(private readonly personRepository: PersonRepository) {}

  async create(personDto: PersonDto) {
    const exists = await this.personRepository.existsByName(personDto.name);
    if (exists) throw new Error('Person already exists');
    return this.personRepository.create(personDto);
  }
}

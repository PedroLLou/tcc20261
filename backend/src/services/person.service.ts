import { Injectable } from '@nestjs/common';
import { PersonRepository } from '../repositories/person.repository';
import { PersonDto } from '../dto/person.dto';

@Injectable()
export class PersonService {
  constructor(private readonly personRepository: PersonRepository) {}

  async create(personDto: PersonDto) {
    const exists = await this.personRepository.existsByEmail(personDto.email);
    if (exists) throw new Error('Email already being used');
    return await this.personRepository.create(personDto);
  }

  async findAll() {
    return await this.personRepository.findAll();
  }

  async findOne(id: number) {
    return await this.personRepository.findOne(id);
  }

  async update(id: number, personDto: PersonDto) {
    return await this.personRepository.update(id, personDto);
  }

  async remove(id: number) {
    return await this.personRepository.remove(id);
  }
}

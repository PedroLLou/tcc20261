import { Injectable } from '@nestjs/common';
import { Person } from '../models/person.entity';
import { PersonDto } from '../dto/person.dto';

@Injectable()
export class PersonRepository {
  private persons: Person[] = [];

  async existsByName(name: string): Promise<boolean> {
    return this.persons.some(person => person.name === name);
  }

  async create(dto: PersonDto): Promise<Person> {
    const person = new Person();
    person.name = dto.name;
    person.age = dto.age;
    this.persons.push(person);
    return person;
  }
}

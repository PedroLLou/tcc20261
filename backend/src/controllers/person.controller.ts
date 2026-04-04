import { Controller, Post, Body } from '@nestjs/common';
import { PersonService } from '../services/person.service';
import { PersonDto } from '../dto/person.dto';

@Controller('persons')
export class PersonController {
  constructor(private readonly personService: PersonService) {}

  @Post()
  async create(@Body() personDto: PersonDto) {
    return this.personService.create(personDto);
  }
}

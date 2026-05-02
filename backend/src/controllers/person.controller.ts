import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { PersonService } from '../services/person.service';
import { PersonDto } from '../dto/person.dto';

@Controller('persons')
export class PersonController {
  constructor(private readonly personService: PersonService) {}

  @Post()
  async create(@Body() personDto: PersonDto) {
    return await this.personService.create(personDto);
  }

  @Get()
  async findAll() {
    return await this.personService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.personService.findOne(Number(id));
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() personDto: PersonDto) {
    return await this.personService.update(Number(id), personDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.personService.remove(Number(id));
  }
}

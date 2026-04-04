import { Module } from '@nestjs/common';
import { PersonController } from '../controllers/person.controller';
import { PersonService } from '../services/person.service';
import { PersonRepository } from '../repositories/person.repository';

@Module({
  controllers: [PersonController],
  providers: [PersonService, PersonRepository],
  exports: [PersonService, PersonRepository],
})
export class PersonModule {}

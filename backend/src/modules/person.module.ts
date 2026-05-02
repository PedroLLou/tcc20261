
import { Module } from '@nestjs/common';
import { PersonController } from '../controllers/person.controller';
import { PersonService } from '../services/person.service';
import { PersonRepository } from '../repositories/person.repository';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PersonController],
  providers: [PersonService, PersonRepository],
  exports: [PersonService, PersonRepository],
})
export class PersonModule {}


import { Module } from '@nestjs/common';
import { PersonModule } from './modules/person.module';
import { PrismaModule } from './prisma.module';

@Module({
  imports: [PrismaModule, PersonModule],
  controllers: [],
  providers: [],
})
export class AppModule {}

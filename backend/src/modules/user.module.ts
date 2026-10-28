import { Module } from '@nestjs/common';
import { AuthModule } from './auth.module';
import { UserController } from '../controllers/user.controller';
import { UserService } from '../services/user.service';
import { RolesGuard } from '../guards/roles.guard';

@Module({
  imports: [AuthModule],
  controllers: [UserController],
  providers: [UserService, RolesGuard],
})
export class UserModule {}

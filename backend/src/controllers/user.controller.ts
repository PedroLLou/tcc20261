import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../guards/roles.guard';
import { UserService } from '../services/user.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('available-for-facts')
  @Roles('ADMIN_LEADER', 'ADMIN_RH', 'TEAM_MEMBER')
  listAvailableForFacts() {
    return this.userService.listAvailableForFacts();
  }
}

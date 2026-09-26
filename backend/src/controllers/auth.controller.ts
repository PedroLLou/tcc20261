import { Controller, Post, Body, UseGuards, Get, Delete, Param, Req } from '@nestjs/common';
import type { User } from '@prisma/client';
import { AuthService } from '../services/auth.service';
import {
  CreateManagedUserDto,
  LoginDto,
  RegisterDto,
  CreateTeamDto,
  AuthResponseDto,
} from '../dto/auth.dto';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../guards/roles.guard';

interface AuthenticatedRequest { user: Pick<User, 'id'>; }

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso' })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Get('teams')
  listTeams() { return this.authService.listTeams(); }

  @Post('teams')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN_RH')
  createTeam(@Body() dto: CreateTeamDto) { return this.authService.createTeam(dto.name); }

  @Delete('teams/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN_RH')
  deleteTeam(@Param('id') id: string) { return this.authService.deleteTeam(Number(id)); }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN_RH')
  listManagedUsers() { return this.authService.listManagedUsers(); }

  @Post('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN_RH')
  async createManagedUser(@Body() dto: CreateManagedUserDto) {
    return this.authService.createManagedUser(dto);
  }

  @Delete('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN_RH')
  deleteManagedUser(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.authService.deleteManagedUser(Number(id), request.user.id);
  }

  @Post('login')
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }
}

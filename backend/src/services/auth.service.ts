import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../repositories/user.repository';
import { TeamRepository } from '../repositories/team.repository';
import type { User } from '../models/user.model';
import { withOperationSpan } from '../observability/operations';
import {
  CreateManagedUserDto,
  LoginDto,
  RegisterDto,
  AuthResponseDto,
} from '../dto/auth.dto';

interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly teams: TeamRepository,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { name, age, email, password, teamId } = registerDto;

    // Verificar se usuário já existe
    const existingUser = await this.users.findByEmail(email);

    if (existingUser) {
      throw new ConflictException('Email já cadastrado');
    }

    if (
      !Number.isInteger(Number(teamId)) ||
      Number(teamId) < 1 ||
      !(await this.teams.findById(Number(teamId)))
    ) {
      throw new ConflictException('Equipe não encontrada');
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário
    const user = await this.users.create({
      name,
      age,
      email,
      password: hashedPassword,
      role: 'TEAM_MEMBER',
      team: { connect: { id: Number(teamId) } },
    });

    return this.generateAuthResponse(user);
  }

  async createManagedUser(dto: CreateManagedUserDto) {
    const email = dto.email.trim();
    const existingUser = await this.users.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email já cadastrado');
    }

    if (
      dto.role !== 'ADMIN_RH' &&
      (!Number.isInteger(Number(dto.teamId)) ||
        Number(dto.teamId) < 1 ||
        !(await this.teams.findById(Number(dto.teamId))))
    ) {
      throw new ConflictException('Selecione uma equipe válida');
    }

    const password = await bcrypt.hash(dto.password, 10);
    return this.users.createManaged({
      name: dto.name.trim(),
      age: dto.age,
      email,
      password,
      role: dto.role,
      ...(dto.role === 'ADMIN_RH'
        ? {}
        : { team: { connect: { id: Number(dto.teamId) } } }),
    });
  }

  listTeams() {
    return this.teams.list();
  }

  listManagedUsers() {
    return this.users.listManaged();
  }

  async deleteManagedUser(id: number, actorId: number) {
    const result = await this.users.deleteManaged(id, actorId);
    if (!result) throw new NotFoundException('Usuário não encontrado.');
    if ('error' in result && result.error === 'SELF') {
      throw new ConflictException('Não é possível excluir sua própria conta.');
    }
    if ('error' in result && result.error === 'LAST_ADMIN') {
      throw new ConflictException(
        'O último administrador RH não pode ser excluído.',
      );
    }
    return { message: 'Usuário excluído.' };
  }

  async deleteTeam(id: number) {
    const team = await this.teams.findById(id);
    if (!team) throw new NotFoundException('Equipe não encontrada.');
    const assignedUsers = await this.users.countByTeam(id);
    if (assignedUsers > 0) {
      throw new ConflictException(
        'Exclua os usuários vinculados à equipe antes de removê-la.',
      );
    }
    await this.teams.delete(id);
    return { message: 'Equipe excluída.' };
  }

  async createTeam(name: string) {
    const normalizedName = name.trim();
    if (!normalizedName)
      throw new BadRequestException('Informe o nome da equipe');
    if (await this.teams.findByName(normalizedName)) {
      throw new ConflictException('Já existe uma equipe com esse nome');
    }
    return this.teams.create(normalizedName);
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Buscar usuário
    const user = await this.users.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Verificar senha
    const isPasswordValid = await withOperationSpan(
      'auth.verify_password',
      () => bcrypt.compare(password, user.password),
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.generateAuthResponse(user);
  }

  async validateToken(payload: JwtPayload): Promise<User> {
    const user = await this.users.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    return user;
  }

  private generateAuthResponse(user: User): AuthResponseDto {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const access_token = this.jwtService.sign(payload);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      access_token,
    };
  }
}

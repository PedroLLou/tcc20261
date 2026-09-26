import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma.service';
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
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { name, age, email, password, teamId } = registerDto;

    // Verificar se usuário já existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email já cadastrado');
    }

    if (!Number.isInteger(Number(teamId)) || Number(teamId) < 1 || !await this.prisma.team.findUnique({ where: { id: Number(teamId) } })) {
      throw new ConflictException('Equipe não encontrada');
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário
    const user = await this.prisma.user.create({
      data: {
        name,
        age,
        email,
        password: hashedPassword,
        role: 'TEAM_MEMBER',
        teamId: Number(teamId),
      },
    });

    return this.generateAuthResponse(user);
  }

  async createManagedUser(dto: CreateManagedUserDto) {
    const email = dto.email.trim();
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Email já cadastrado');
    }

    if (dto.role !== 'ADMIN_RH' && (!Number.isInteger(Number(dto.teamId)) || Number(dto.teamId) < 1 || !await this.prisma.team.findUnique({ where: { id: Number(dto.teamId) } }))) {
      throw new ConflictException('Selecione uma equipe válida');
    }

    const password = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        age: dto.age,
        email,
        password,
        role: dto.role,
        ...(dto.role === 'ADMIN_RH' ? {} : { teamId: Number(dto.teamId) }),
      },
      select: { id: true, name: true, age: true, email: true, role: true, teamId: true },
    });
  }

  listTeams() {
    return this.prisma.team.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { users: true } } },
    });
  }

  listManagedUsers() {
    return this.prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, age: true, email: true, role: true, teamId: true,
        team: { select: { id: true, name: true } },
      },
    });
  }

  async deleteManagedUser(id: number, actorId: number) {
    await this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.findUnique({ where: { id } });
      if (!user) throw new NotFoundException('Usuário não encontrado.');
      if (user.id === actorId) throw new ConflictException('Não é possível excluir sua própria conta.');
      if (user.role === 'ADMIN_RH') {
        const adminCount = await transaction.user.count({ where: { role: 'ADMIN_RH' } });
        if (adminCount <= 1) throw new ConflictException('O último administrador RH não pode ser excluído.');
      }
      await transaction.user.delete({ where: { id } });
    }, { isolationLevel: 'Serializable' });
    return { message: 'Usuário excluído.' };
  }

  async deleteTeam(id: number) {
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team) throw new NotFoundException('Equipe não encontrada.');
    const assignedUsers = await this.prisma.user.count({ where: { teamId: id } });
    if (assignedUsers > 0) {
      throw new ConflictException('Exclua os usuários vinculados à equipe antes de removê-la.');
    }
    await this.prisma.team.delete({ where: { id } });
    return { message: 'Equipe excluída.' };
  }

  async createTeam(name: string) {
    const normalizedName = name.trim();
    if (!normalizedName) throw new BadRequestException('Informe o nome da equipe');
    if (await this.prisma.team.findUnique({ where: { name: normalizedName } })) {
      throw new ConflictException('Já existe uma equipe com esse nome');
    }
    return this.prisma.team.create({ data: { name: normalizedName } });
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Buscar usuário
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Verificar senha
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.generateAuthResponse(user);
  }

  async validateToken(payload: JwtPayload): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

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

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from '../services/auth.service';
import { AuthController } from '../controllers/auth.controller';
import { JwtStrategy } from '../guards/jwt.strategy';
import { RolesGuard } from '../guards/roles.guard';
import { PrismaModule } from '../prisma.module';
import { UserRepository } from '../repositories/user.repository';
import { TeamRepository } from '../repositories/team.repository';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  providers: [
    AuthService,
    UserRepository,
    TeamRepository,
    JwtStrategy,
    RolesGuard,
  ],
  controllers: [AuthController],
  exports: [AuthService, UserRepository],
})
export class AuthModule {}

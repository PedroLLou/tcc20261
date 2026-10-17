import { IsEmail, IsInt, IsNotEmpty, IsString, Max, Min, IsIn } from 'class-validator';
import type { UserRole } from '../models/user.model';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(1)
  @Max(120)
  age: number;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsInt()
  @Min(1)
  teamId: number;
}

export class CreateManagedUserDto extends RegisterDto {
  @IsIn(['TEAM_MEMBER', 'ADMIN_LEADER', 'ADMIN_RH'])
  role: UserRole;
}

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class AuthResponseDto {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  access_token: string;
}

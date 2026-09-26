export class LoginDto {
  email: string;
  password: string;
}

export class RegisterDto {
  name: string;
  age: number;
  email: string;
  password: string;
}

export class CreateManagedUserDto extends RegisterDto {
  role: 'TEAM_MEMBER' | 'ADMIN_LEADER' | 'ADMIN_RH';
}

export class AuthResponseDto {
  id: number;
  email: string;
  name: string;
  role: string;
  access_token: string;
}

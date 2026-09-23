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

export class AuthResponseDto {
  id: number;
  email: string;
  name: string;
  role: string;
  access_token: string;
}

import axios from 'axios';

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'ADMIN_LEADER' | 'TEAM_MEMBER' | 'ADMIN_RH';
  access_token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  age: number;
  email: string;
  password: string;
}

class AuthService {
  private api: ReturnType<typeof axios.create>;

  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
    });
  }

  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);

    this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  getUser(): User | null {
    const user = localStorage.getItem(this.USER_KEY);

    if (!user) {
      return null;
    }

    try {
      return JSON.parse(user) as User;
    } catch {
      localStorage.removeItem(this.USER_KEY);
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  async login(credentials: LoginRequest): Promise<User> {
    const response = await this.api.post<User>(
      '/api/v1/auth/login',
      credentials,
    );

    const user = response.data;

    this.setToken(user.access_token);
    this.setUser(user);

    return user;
  }

  async register(data: RegisterRequest): Promise<User> {
    const response = await this.api.post<User>(
      '/api/v1/auth/register',
      data,
    );

    const user = response.data;

    this.setToken(user.access_token);
    this.setUser(user);

    return user;
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);

    delete this.api.defaults.headers.common['Authorization'];
  }

  initializeAuth(): void {
    const token = this.getToken();

    if (token) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }
}

export default new AuthService();

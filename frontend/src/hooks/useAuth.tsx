import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from 'react';
import authService from '../services/authService';
import type { User } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    age: number,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(() => {
    return authService.getUser();
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      authService.initializeAuth();
      setIsLoading(false);
    };

    void initialize();
  }, []);

  const login = async (email: string, password: string) => {
    const userData = await authService.login({ email, password });
    setUser(userData);
  };

  const register = async (
    name: string,
    age: number,
    email: string,
    password: string,
  ) => {
    const userData = await authService.register({
      name,
      age,
      email,
      password,
    });
    setUser(userData);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }

  return context;
};

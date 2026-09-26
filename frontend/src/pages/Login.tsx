import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import authService from '../services/authService';
import type { Team } from '../services/authService';
import '../styles/Login.css';

const Login: React.FC = () => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  useEffect(() => { void authService.listTeams().then(setTeams).catch(() => setTeams([])); }, []);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    age: '',
    teamId: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await register(
          formData.name,
          Number(formData.age),
          formData.email,
          formData.password,
          Number(formData.teamId),
        );
      }
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'response' in err
      ) {
        const response = (
          err as {
            response?: {
              data?: {
                message?: string | string[];
              };
            };
          }
        ).response;

        const message = response?.data?.message;

        if (Array.isArray(message)) {
          setError(message.join(', '));
        } else {
          setError(message ?? 'Erro na autenticação');
        }
      } else {
        setError('Erro na autenticação');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="login-container">
    <div className="login-card">
      <h1 className="login-title">
        {isLogin ? 'Login' : 'Cadastro'}
      </h1>

      <form onSubmit={handleSubmit} className="login-form">
        {!isLogin && (
          <>
            <div className="form-group">
              <label htmlFor="name">Nome Completo</label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Seu nome completo"
                required={!isLogin}
              />
            </div>

            <div className="form-group">
              <label htmlFor="age">Idade</label>
              <input
                id="age"
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                placeholder="Sua idade"
                required={!isLogin}
              />
            </div>
            <div className="form-group">
              <label htmlFor="teamId">Equipe</label>
              <select id="teamId" name="teamId" value={formData.teamId} onChange={(event) => setFormData((prev) => ({ ...prev, teamId: event.target.value }))} required>
                <option value="">Selecione sua equipe</option>
                {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
            </div>
          </>
        )}

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="seu@email.com"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Sua senha"
            required
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? 'Carregando...' : isLogin ? 'Entrar' : 'Cadastrar'}
        </button>
      </form>

      <div className="toggle-auth">
        {isLogin ? 'Novo usuário? ' : 'Já tem conta? '}

        <button
          type="button"
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
            setFormData({
              email: '',
              password: '',
              name: '',
              age: '',
              teamId: '',
            });
          }}
          className="toggle-button"
        >
          {isLogin ? 'Cadastre-se' : 'Faça login'}
        </button>
      </div>
    </div>
  </div>
);
};

export default Login;

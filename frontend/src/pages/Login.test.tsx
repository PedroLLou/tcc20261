import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Login from './Login';
import { useAuth } from '../hooks/useAuth';

jest.mock('../hooks/useAuth');

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('Login', () => {
  const loginMock = jest.fn();
  const registerMock = jest.fn();
  const logoutMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: loginMock,
      register: registerMock,
      logout: logoutMock,
    });
  });

  it('deve exibir o formulário de login', () => {
    render(<Login />);

    expect(
      screen.getByRole('heading', { name: 'Login' }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: 'Entrar' }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: 'Cadastre-se' }),
    ).toBeInTheDocument();
  });

  it('deve alternar para o formulário de cadastro', () => {
    render(<Login />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Cadastre-se' }),
    );

    expect(
      screen.getByRole('heading', { name: 'Cadastro' }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText('Nome Completo')).toBeInTheDocument();
    expect(screen.getByLabelText('Idade')).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: 'Cadastrar' }),
    ).toBeInTheDocument();
  });
});
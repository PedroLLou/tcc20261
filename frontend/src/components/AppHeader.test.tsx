import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import AppHeader from './AppHeader';

describe('AppHeader', () => {
  const logoutMock = jest.fn();
  const toggleMenuMock = jest.fn();

  const renderHeader = (isMenuOpen = true) =>
    render(
      <AppHeader
        userName="Maria Souza"
        roleLabel="Líder de Equipe"
        isMenuOpen={isMenuOpen}
        onToggleMenu={toggleMenuMock}
        onLogout={logoutMock}
      />,
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve exibir o nome do sistema no cabeçalho', () => {
    renderHeader();

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Sistema de Gerenciamento de Feedbacks',
      }),
    ).toBeInTheDocument();
  });

  it('deve exibir o nome e o perfil do usuário logado', () => {
    renderHeader();

    const userButton = screen.getByRole('button', { name: /Maria Souza/ });

    expect(userButton).toHaveTextContent('Líder de Equipe');
  });

  it('deve identificar o botão do usuário pelo nome, sem depender do texto visível', () => {
    renderHeader();

    expect(screen.getByRole('button', { name: 'Menu do usuário Maria Souza' })).toBeInTheDocument();
  });

  it('deve oferecer fechar o menu lateral quando ele está aberto', () => {
    renderHeader(true);

    expect(screen.getByRole('button', { name: 'Fechar menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('deve oferecer abrir o menu lateral quando ele está fechado', () => {
    renderHeader(false);

    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('deve avisar ao clicar no botão do menu lateral', () => {
    renderHeader();

    fireEvent.click(screen.getByRole('button', { name: 'Fechar menu' }));

    expect(toggleMenuMock).toHaveBeenCalledTimes(1);
  });

  it('deve manter a opção Sair escondida até abrir o menu do usuário', () => {
    renderHeader();

    expect(screen.queryByRole('menuitem', { name: 'Sair' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Maria Souza/ }));

    expect(screen.getByRole('menuitem', { name: 'Sair' })).toBeInTheDocument();
  });

  it('deve chamar a saída ao clicar em Sair e fechar o menu', () => {
    renderHeader();

    fireEvent.click(screen.getByRole('button', { name: /Maria Souza/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sair' }));

    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menuitem', { name: 'Sair' })).not.toBeInTheDocument();
  });

  it('deve fechar o menu do usuário ao apertar Escape', () => {
    renderHeader();

    fireEvent.click(screen.getByRole('button', { name: /Maria Souza/ }));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('menuitem', { name: 'Sair' })).not.toBeInTheDocument();
  });
});

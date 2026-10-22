import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SideNav from './SideNav';

describe('SideNav', () => {
  const selectMock = jest.fn();

  const items = [
    { key: 'panel', label: 'Painel' },
    { key: 'users', label: 'Usuários' },
    { key: 'teams', label: 'Equipes' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve exibir todas as opções de navegação', () => {
    render(<SideNav items={items} activeKey="panel" onSelect={selectMock} />);

    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Painel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Usuários' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Equipes' })).toBeInTheDocument();
  });

  it('deve marcar apenas a opção ativa como página atual', () => {
    render(<SideNav items={items} activeKey="users" onSelect={selectMock} />);

    expect(screen.getByRole('button', { name: 'Usuários' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Painel' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('button', { name: 'Equipes' })).not.toHaveAttribute('aria-current');
  });

  it('deve avisar qual opção foi escolhida ao clicar', () => {
    render(<SideNav items={items} activeKey="panel" onSelect={selectMock} />);

    fireEvent.click(screen.getByRole('button', { name: 'Equipes' }));

    expect(selectMock).toHaveBeenCalledWith('teams');
  });
});

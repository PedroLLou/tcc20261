import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Dashboard from './Dashboard';
import feedbackSessionService from '../services/feedbackSessionService';
import type { FeedbackProcess } from '../types/feedback-process';

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 7, name: 'Maria Souza', role: 'ADMIN_LEADER' },
    logout: jest.fn(),
  }),
}));

const plannedProcess: FeedbackProcess = {
  id: 3,
  description: null,
  objective: 'Melhorar a comunicação da equipe',
  startsAt: null,
  endsAt: null,
  criteria: [],
  observation: null,
  status: 'PLANNED',
  ownerId: 7,
  participantId: 9,
  participant: { id: 9, name: 'Ana Lima', email: 'ana@empresa.com' },
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:00:00.000Z',
};

jest.mock('../hooks/useFeedbackProcesses', () => ({
  useFeedbackProcesses: () => ({
    processes: [plannedProcess],
    isLoading: false,
    error: '',
    reload: jest.fn(),
    remove: jest.fn(),
  }),
}));

jest.mock('../services/feedbackSessionService');

describe('Dashboard', () => {
  const createMock = feedbackSessionService.create as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve criar a sessão do processo escolhido e confirmar na tela', async () => {
    createMock.mockResolvedValue({ id: 1, processId: 3 });
    render(<Dashboard />);

    fireEvent.click(screen.getByRole('button', { name: 'Criar sessão' }));

    expect(await screen.findByText('Sessão de feedback criada.')).toBeInTheDocument();
    expect(createMock).toHaveBeenCalledWith(3);
  });

  it('deve mostrar o erro quando a sessão não pode ser criada', async () => {
    createMock.mockRejectedValue(new Error('falha'));
    render(<Dashboard />);

    fireEvent.click(screen.getByRole('button', { name: 'Criar sessão' }));

    expect(
      await screen.findByText('Não foi possível criar a sessão. Tente novamente.'),
    ).toBeInTheDocument();
  });
});

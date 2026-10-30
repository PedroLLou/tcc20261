import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Dashboard from './Dashboard';
import feedbackSessionService from '../services/feedbackSessionService';
import type { FeedbackProcess } from '../types/feedback-process';

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 7, name: 'Maria Souza', role: 'ADMIN_LEADER' },
    logout: jest.fn(),
  }),
}));

const buildProcess = (id: number, participantName: string): FeedbackProcess => ({
  id,
  description: null,
  objective: 'Melhorar a comunicação da equipe',
  startsAt: null,
  endsAt: null,
  criteria: [],
  observation: null,
  status: 'PLANNED',
  ownerId: 7,
  participantId: id + 10,
  participant: { id: id + 10, name: participantName, email: `${id}@empresa.com` },
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:00:00.000Z',
});

const mockPlannedProcesses = [buildProcess(3, 'Ana Lima'), buildProcess(4, 'Bia Costa')];

jest.mock('../hooks/useFeedbackProcesses', () => ({
  useFeedbackProcesses: () => ({
    processes: mockPlannedProcesses,
    isLoading: false,
    error: '',
    reload: jest.fn(),
    remove: jest.fn(),
  }),
}));

jest.mock('../services/feedbackSessionService');

describe('Dashboard', () => {
  const createMock = feedbackSessionService.create as jest.Mock;
  const sessionButtons = () =>
    screen.getAllByRole('button', { name: /Criar sessão|Criando\.\.\./ });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve criar a sessão do processo escolhido e confirmar na tela', async () => {
    createMock.mockResolvedValue({ id: 1, processId: 3 });
    render(<Dashboard />);

    fireEvent.click(sessionButtons()[0]);

    expect(await screen.findByText('Sessão de feedback criada.')).toBeInTheDocument();
    expect(createMock).toHaveBeenCalledWith(3);
  });

  it('deve abrir o campo de objetivo da sessão criada e salvar o objetivo', async () => {
    const defineMock = feedbackSessionService.defineObjective as jest.Mock;
    createMock.mockResolvedValue({ id: 1, processId: 3, objective: null });
    defineMock.mockResolvedValue({ id: 1, processId: 3, objective: 'Alinhar metas' });
    render(<Dashboard />);

    fireEvent.click(sessionButtons()[0]);
    fireEvent.change(await screen.findByLabelText('Objetivo da sessão'), {
      target: { value: 'Alinhar metas' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar objetivo' }));

    expect(await screen.findByText('Objetivo da sessão salvo.')).toBeInTheDocument();
    expect(defineMock).toHaveBeenCalledWith(1, 'Alinhar metas');
  });

  it('deve abrir o campo de data e horário da sessão criada e salvar', async () => {
    const defineMock = feedbackSessionService.defineSchedule as jest.Mock;
    createMock.mockResolvedValue({ id: 1, processId: 3, scheduledAt: null });
    defineMock.mockResolvedValue({ id: 1, processId: 3 });
    render(<Dashboard />);

    fireEvent.click(sessionButtons()[0]);
    fireEvent.change(await screen.findByLabelText('Data e horário da sessão'), {
      target: { value: '2099-11-05T10:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar data e horário' }));

    expect(await screen.findByText('Data e horário da sessão salvos.')).toBeInTheDocument();
    expect(defineMock).toHaveBeenCalledWith(1, new Date('2099-11-05T10:00').toISOString());
  });

  it('deve manter o objetivo digitado de uma sessão quando outra sessão é criada', async () => {
    let finishSecond: (session: unknown) => void = () => undefined;
    createMock
      .mockResolvedValueOnce({ id: 1, processId: 3, objective: null })
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finishSecond = resolve;
        }),
      );
    render(<Dashboard />);

    fireEvent.click(sessionButtons()[0]);
    const [firstField] = await screen.findAllByLabelText('Objetivo da sessão');
    fireEvent.change(firstField, { target: { value: 'Alinhar metas' } });
    fireEvent.click(sessionButtons()[1]);
    await act(async () => {
      finishSecond({ id: 2, processId: 4, objective: null });
    });

    const fields = await screen.findAllByLabelText('Objetivo da sessão');
    expect(fields).toHaveLength(2);
    expect(fields[0]).toHaveValue('Alinhar metas');
  });

  it('deve mostrar o erro quando a sessão não pode ser criada', async () => {
    createMock.mockRejectedValue(new Error('falha'));
    render(<Dashboard />);

    fireEvent.click(sessionButtons()[0]);

    expect(
      await screen.findByText('Não foi possível criar a sessão. Tente novamente.'),
    ).toBeInTheDocument();
  });

  it('deve manter bloqueado o botão que ainda espera resposta quando outro termina', async () => {
    let finishFirst: (session: unknown) => void = () => undefined;
    createMock
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finishFirst = resolve;
        }),
      )
      .mockReturnValueOnce(new Promise(() => undefined));
    render(<Dashboard />);

    fireEvent.click(sessionButtons()[0]);
    fireEvent.click(sessionButtons()[1]);
    await act(async () => {
      finishFirst({ id: 1, processId: 3 });
    });

    await waitFor(() => expect(sessionButtons()[0]).toHaveTextContent('Criar sessão'));
    expect(sessionButtons()[1]).toHaveTextContent('Criando...');
    expect(sessionButtons()[1]).toBeDisabled();
  });
});

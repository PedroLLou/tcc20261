import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import FeedbackProcessList from './FeedbackProcessList';
import type { FeedbackProcess } from '../types/feedback-process';

const buildProcess = (overrides: Partial<FeedbackProcess> = {}): FeedbackProcess => ({
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
  ...overrides,
});

describe('FeedbackProcessList', () => {
  const onSelect = jest.fn();
  const onDelete = jest.fn();
  const onCreateSession = jest.fn();

  const renderList = (
    process: FeedbackProcess,
    creatingSessionProcessId: number | null = null,
  ) =>
    render(
      <FeedbackProcessList
        processes={[process]}
        deletingProcessId={null}
        currentUserId={7}
        creatingSessionProcessId={creatingSessionProcessId}
        onSelect={onSelect}
        onDelete={onDelete}
        onCreateSession={onCreateSession}
      />,
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve oferecer criar sessão em um processo planejado do próprio líder', () => {
    renderList(buildProcess());

    expect(screen.getByRole('button', { name: 'Criar sessão' })).toBeInTheDocument();
  });

  it('deve esconder criar sessão quando o processo não está planejado', () => {
    renderList(buildProcess({ status: 'DRAFT' }));

    expect(screen.queryByRole('button', { name: 'Criar sessão' })).not.toBeInTheDocument();
  });

  it('deve esconder criar sessão quando o processo é de outro líder', () => {
    renderList(buildProcess({ ownerId: 8 }));

    expect(screen.queryByRole('button', { name: 'Criar sessão' })).not.toBeInTheDocument();
  });

  it('deve avisar qual processo foi escolhido ao clicar em criar sessão', () => {
    const process = buildProcess();
    renderList(process);

    fireEvent.click(screen.getByRole('button', { name: 'Criar sessão' }));

    expect(onCreateSession).toHaveBeenCalledWith(process);
  });

  it('deve desabilitar o botão enquanto a sessão é criada', () => {
    renderList(buildProcess(), 3);

    expect(screen.getByRole('button', { name: 'Criando...' })).toBeDisabled();
  });
});

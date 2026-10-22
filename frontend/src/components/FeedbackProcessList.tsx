import React from 'react';
import type { FeedbackProcess } from '../types/feedback-process';
import FeedbackProcessStatusLabel from './FeedbackProcessStatus';

interface FeedbackProcessListProps {
  processes: FeedbackProcess[];
  deletingProcessId: number | null;
  currentUserId?: number;
  creatingSessionProcessId?: number | null;
  onSelect: (process: FeedbackProcess) => void;
  onDelete: (process: FeedbackProcess) => void;
  onCreateSession?: (process: FeedbackProcess) => void;
}

const FeedbackProcessList: React.FC<FeedbackProcessListProps> = ({
  processes,
  deletingProcessId,
  currentUserId,
  creatingSessionProcessId = null,
  onSelect,
  onDelete,
  onCreateSession,
}) => (
  <ul className="process-list">
    {processes.map((process) => (
      <li className="process-list-item" key={process.id}>
        <button className="process-list-open" type="button" onClick={() => onSelect(process)}>
          <span className="process-list-participant">{process.participant?.name ?? 'Participante não definido'}</span>
          <span className="process-list-objective">{process.objective || 'Objetivo não definido'}</span>
          <span className="process-list-meta">
            {process.startsAt ? process.startsAt.slice(0, 10) : 'Sem início'}
            {process.endsAt ? ` a ${process.endsAt.slice(0, 10)}` : ''}
            <FeedbackProcessStatusLabel status={process.status} />
          </span>
        </button>
        {onCreateSession && process.status === 'PLANNED' && process.ownerId === currentUserId && (
          <button className="process-session-button" type="button" disabled={creatingSessionProcessId === process.id} onClick={() => onCreateSession(process)}>
            {creatingSessionProcessId === process.id ? 'Criando...' : 'Criar sessão'}
          </button>
        )}
        <button className="process-delete-button" type="button" disabled={deletingProcessId === process.id} onClick={() => onDelete(process)}>
          {deletingProcessId === process.id ? 'Excluindo...' : 'Excluir'}
        </button>
      </li>
    ))}
  </ul>
);

export default FeedbackProcessList;

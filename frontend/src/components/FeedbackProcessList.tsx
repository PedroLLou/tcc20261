import React from 'react';
import type { FeedbackProcess } from '../types/feedback-process';
import FeedbackProcessStatusLabel from './FeedbackProcessStatus';

interface FeedbackProcessListProps {
  processes: FeedbackProcess[];
  deletingProcessId: number | null;
  currentUserId?: number;
  creatingSessionProcessIds?: number[];
  onSelect: (process: FeedbackProcess) => void;
  onDelete: (process: FeedbackProcess) => void;
  onCreateSession?: (process: FeedbackProcess) => void;
}

const FeedbackProcessList: React.FC<FeedbackProcessListProps> = ({
  processes,
  deletingProcessId,
  currentUserId,
  creatingSessionProcessIds = [],
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
          <button className="process-session-button" type="button" disabled={creatingSessionProcessIds.includes(process.id)} onClick={() => onCreateSession(process)}>
            {creatingSessionProcessIds.includes(process.id) ? 'Criando...' : 'Criar sessão'}
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

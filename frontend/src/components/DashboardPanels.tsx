import React from 'react';
import FeedbackProcessList from './FeedbackProcessList';
import type { FeedbackProcess } from '../types/feedback-process';

interface ReportsPanelProps {
  title?: string;
}

export const ReportsPanel: React.FC<ReportsPanelProps> = ({
  title = 'Relatórios',
}) => (
  <section className="report-panel" aria-labelledby="reports-panel-title">
    <div className="report-panel-heading">
      <div>
        <p className="process-panel-eyebrow">Visão geral</p>
        <h3 id="reports-panel-title">{title}</h3>
      </div>
      <span className="work-in-progress">Em desenvolvimento</span>
    </div>
    <div className="report-panel-space" aria-hidden="true" />
  </section>
);

interface ProcessPanelProps {
  processes: FeedbackProcess[];
  isLoading: boolean;
  error: string;
  canCreate: boolean;
  deletingProcessId: number | null;
  notice?: string;
  currentUserId?: number;
  creatingSessionProcessIds?: number[];
  onCreate: () => void;
  onSelect: (process: FeedbackProcess) => void;
  onDelete: (process: FeedbackProcess) => void;
  onCreateSession?: (process: FeedbackProcess) => void;
}

export const ProcessPanel: React.FC<ProcessPanelProps> = ({
  processes,
  isLoading,
  error,
  canCreate,
  deletingProcessId,
  notice,
  currentUserId,
  creatingSessionProcessIds,
  onCreate,
  onSelect,
  onDelete,
  onCreateSession,
}) => (
  <section className="process-panel" aria-labelledby="process-panel-title">
    <div className="process-panel-heading">
      <div>
        <p className="process-panel-eyebrow">Planejamento</p>
        <h3 id="process-panel-title">Processos de feedback</h3>
      </div>
      {canCreate && (
        <button className="process-create-button" type="button" onClick={onCreate}>
          Criar novo planejamento
        </button>
      )}
    </div>
    {error && (
      <p className="process-list-error" role="alert">
        {error}
      </p>
    )}
    {notice && (
      <p className="process-list-notice" role="status">
        {notice}
      </p>
    )}
    {isLoading ? (
      <p className="process-list-empty">Carregando processos...</p>
    ) : processes.length === 0 ? (
      <p className="process-list-empty">Ainda não há planejamentos.</p>
    ) : (
      <FeedbackProcessList
        processes={processes}
        deletingProcessId={deletingProcessId}
        currentUserId={currentUserId}
        creatingSessionProcessIds={creatingSessionProcessIds}
        onSelect={onSelect}
        onDelete={onDelete}
        onCreateSession={onCreateSession}
      />
    )}
  </section>
);

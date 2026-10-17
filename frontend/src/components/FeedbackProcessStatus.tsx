import React from 'react';
import type { FeedbackProcessStatus } from '../types/feedback-process';

const labels: Record<FeedbackProcessStatus, string> = {
  DRAFT: 'Rascunho',
  SENT_FOR_VALIDATION: 'Enviado para validação',
  PLANNED: 'Planejado',
};

interface FeedbackProcessStatusProps {
  status: FeedbackProcessStatus;
}

const FeedbackProcessStatusLabel: React.FC<FeedbackProcessStatusProps> = ({ status }) => (
  <span className={`feedback-status feedback-status-${status.toLowerCase().replace('_', '-')}`}>
    {labels[status]}
  </span>
);

export default FeedbackProcessStatusLabel;

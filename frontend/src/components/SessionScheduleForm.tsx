import React, { useState } from 'react';

interface SessionScheduleFormProps {
  sessionId: number;
  onSave: (scheduledAt: string) => Promise<void>;
}

const SessionScheduleForm: React.FC<SessionScheduleFormProps> = ({ sessionId, onSave }) => {
  const [scheduledAt, setScheduledAt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    setError('');

    const date = new Date(scheduledAt);
    if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
      setError('Escolha uma data e um horário futuros.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(date.toISOString());
      setMessage('Data e horário da sessão salvos.');
    } catch {
      setError('Não foi possível salvar a data e o horário. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="session-schedule-form" onSubmit={(event) => void handleSubmit(event)}>
      <label htmlFor={`session-schedule-${sessionId}`}>Data e horário da sessão</label>
      <input
        id={`session-schedule-${sessionId}`}
        type="datetime-local"
        value={scheduledAt}
        onChange={(event) => setScheduledAt(event.target.value)}
      />
      <button type="submit" className="process-session-button" disabled={isSaving || !scheduledAt}>
        {isSaving ? 'Salvando...' : 'Salvar data e horário'}
      </button>
      {message && (
        <p className="process-list-notice" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="process-list-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
};

export default SessionScheduleForm;

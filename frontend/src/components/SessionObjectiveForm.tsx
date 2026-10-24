import React, { useState } from 'react';

interface SessionObjectiveFormProps {
  participantName: string;
  onSave: (objective: string) => Promise<void>;
}

const SessionObjectiveForm: React.FC<SessionObjectiveFormProps> = ({
  participantName,
  onSave,
}) => {
  const [objective, setObjective] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');
    setError('');
    try {
      await onSave(objective.trim());
      setMessage('Objetivo da sessão salvo.');
    } catch {
      setError('Não foi possível salvar o objetivo. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="session-objective-form" onSubmit={(event) => void handleSubmit(event)}>
      <p className="session-objective-title">Sessão de {participantName}</p>
      <label htmlFor="session-objective">Objetivo da sessão</label>
      <textarea
        id="session-objective"
        value={objective}
        maxLength={500}
        rows={3}
        onChange={(event) => setObjective(event.target.value)}
      />
      <button type="submit" className="process-session-button" disabled={isSaving || !objective.trim()}>
        {isSaving ? 'Salvando...' : 'Salvar objetivo'}
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

export default SessionObjectiveForm;

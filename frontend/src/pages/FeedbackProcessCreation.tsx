import React, { useEffect, useState } from 'react';
import axios from 'axios';
import feedbackProcessService from '../services/feedbackProcessService';
import type {
  FeedbackProcess,
  FeedbackProcessStatus,
  TeamMember,
} from '../services/feedbackProcessService';
import '../styles/FeedbackProcessCreation.css';

const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (message) return message;
  }
  return 'Não foi possível salvar o processo. Tente novamente.';
};

interface FeedbackProcessCreationProps {
  initialProcess?: FeedbackProcess | null;
  userId: number;
  userRole: 'ADMIN_LEADER' | 'ADMIN_RH';
  onBack: () => void;
  onSaved: (process: FeedbackProcess) => void;
}

const dateInputValue = (date: string | null | undefined) =>
  date ? date.slice(0, 10) : '';

const statusLabels: Record<FeedbackProcessStatus, string> = {
  DRAFT: 'Rascunho',
  SENT_FOR_VALIDATION: 'Enviado para validação',
  PLANNED: 'Planejado',
};

const FeedbackProcessCreation: React.FC<FeedbackProcessCreationProps> = ({
  initialProcess = null,
  userId,
  userRole,
  onBack,
  onSaved,
}) => {
  const canEditDraft = Boolean(
    initialProcess?.status === 'DRAFT' &&
    (userRole === 'ADMIN_RH' || initialProcess.ownerId === userId),
  );
  const [objective, setObjective] = useState(initialProcess?.objective ?? '');
  const [participantId, setParticipantId] = useState(
    initialProcess?.participantId?.toString() ?? '',
  );
  const [startsAt, setStartsAt] = useState(dateInputValue(initialProcess?.startsAt));
  const [endsAt, setEndsAt] = useState(dateInputValue(initialProcess?.endsAt));
  const [criteria, setCriteria] = useState(initialProcess?.criteria.join('\n') ?? '');
  const [observation, setObservation] = useState(initialProcess?.observation ?? '');
  const [participants, setParticipants] = useState<TeamMember[]>([]);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedProcess, setSavedProcess] = useState(initialProcess);
  const [step, setStep] = useState(initialProcess ? 2 : 1);
  const [isEditing, setIsEditing] = useState(!initialProcess || canEditDraft);

  useEffect(() => {
    feedbackProcessService
      .listParticipants()
      .then(setParticipants)
      .catch((requestError: unknown) => setError(getErrorMessage(requestError)))
      .finally(() => setIsLoadingParticipants(false));
  }, []);

  const saveProcess = async (status: 'DRAFT' | 'SENT_FOR_VALIDATION') => {
    setError('');
    setIsSaving(true);

    try {
      const fields = {
        objective: objective.trim(),
        participantId: Number(participantId),
        startsAt: startsAt || null,
        endsAt: endsAt || null,
        criteria: criteria.split('\n').map((item) => item.trim()).filter(Boolean),
      };
      let process: FeedbackProcess;
      if (savedProcess) {
        process = await feedbackProcessService.update(savedProcess.id, fields);
      } else {
        process = await feedbackProcessService.create(fields);
        setSavedProcess(process);
      }
      if (savedProcess) {
        if (status === 'SENT_FOR_VALIDATION') {
          process = await feedbackProcessService.submitForValidation(savedProcess.id);
        }
      } else if (status === 'SENT_FOR_VALIDATION') {
        process = await feedbackProcessService.submitForValidation(process.id);
      }
      onSaved(process);
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const approveProcess = async () => {
    if (!initialProcess) return;
    setError('');
    setIsSaving(true);
    try {
      const process = await feedbackProcessService.approve(initialProcess.id);
      onSaved(process);
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const saveObservation = async (requestAdjustments = false) => {
    if (!initialProcess) return;
    setError('');
    setIsSaving(true);
    try {
      const process = requestAdjustments
        ? await feedbackProcessService.requestAdjustments(initialProcess.id, observation)
        : await feedbackProcessService.registerObservation(initialProcess.id, observation);
      onSaved(process);
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  if (initialProcess && !isEditing) {
    return (
      <section className="feedback-create-panel" aria-labelledby="feedback-create-title">
        <button className="feedback-create-back" type="button" onClick={onBack}>Voltar aos processos</button>
        <p className="feedback-create-eyebrow">Planejamento de feedback</p>
        <div className="feedback-detail-heading">
          <h2 id="feedback-create-title">Detalhes do planejamento</h2>
          <span className={`feedback-status feedback-status-${initialProcess.status.toLowerCase().replace('_', '-')}`}>
            {statusLabels[initialProcess.status]}
          </span>
        </div>
        <dl className="feedback-detail-list">
          <div><dt>Participante</dt><dd>{initialProcess.participant?.name ?? 'Não definido'}</dd></div>
          <div><dt>Objetivo</dt><dd>{initialProcess.objective || 'Não definido'}</dd></div>
          <div><dt>Período</dt><dd>{dateInputValue(initialProcess.startsAt) || 'Não definido'} a {dateInputValue(initialProcess.endsAt) || 'Não definido'}</dd></div>
          <div>
            <dt>Critérios de avaliação</dt>
            <dd>{initialProcess.criteria.length ? <ul>{initialProcess.criteria.map((item) => <li key={item}>{item}</li>)}</ul> : 'Ainda não definidos'}</dd>
          </div>
          <div><dt>Observação do RH</dt><dd>{initialProcess.observation || 'Nenhuma observação registrada.'}</dd></div>
        </dl>
        {userRole === 'ADMIN_RH' && (
          <form className="feedback-observation-form" onSubmit={(event) => { event.preventDefault(); void saveObservation(); }}>
            <div className="feedback-create-field">
              <label htmlFor="feedback-observation">Registrar observação</label>
              <textarea
                id="feedback-observation"
                value={observation}
                onChange={(event) => setObservation(event.target.value)}
                maxLength={2000}
                rows={4}
                required
              />
            </div>
            <div className="feedback-create-actions">
              <button className="feedback-create-secondary" type="submit" disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Registrar observação'}
              </button>
              {initialProcess.status === 'SENT_FOR_VALIDATION' && (
                <button className="feedback-create-button" type="button" disabled={isSaving} onClick={() => void saveObservation(true)}>
                  {isSaving ? 'Solicitando...' : 'Solicitar ajustes'}
                </button>
              )}
            </div>
          </form>
        )}
        {initialProcess.status === 'SENT_FOR_VALIDATION' && userRole === 'ADMIN_RH' ? (
          <button className="feedback-create-button" type="button" disabled={isSaving} onClick={() => void approveProcess()}>
            {isSaving ? 'Validando...' : 'Validar planejamento'}
          </button>
        ) : initialProcess.status === 'SENT_FOR_VALIDATION' ? (
          <p className="feedback-validation-note">Aguardando validação..</p>
        ) : initialProcess.status === 'PLANNED' ? (
          <p className="feedback-validation-note">Planejamento aprovado!</p>
        ) : canEditDraft ? (
          <button className="feedback-create-button" type="button" onClick={() => setIsEditing(true)}>
            Editar planejamento
          </button>
        ) : (
          <p className="feedback-validation-note">Este rascunho pertence a outro responsável.</p>
        )}
        {error && <p className="feedback-create-error" role="alert">{error}</p>}
      </section>
    );
  }

  return (
    <section className="feedback-create-panel" aria-labelledby="feedback-create-title">
      <p className="feedback-create-eyebrow">Novo planejamento</p>
      <h2 id="feedback-create-title">{initialProcess ? 'Editar planejamento' : 'Criar processo de feedback'}</h2>
      <p className="feedback-create-intro">
        Etapa {step} de 2: {step === 1 ? 'participante e objetivo' : 'período e critérios'}.
      </p>

      {step === 1 ? (
        <form className="feedback-create-form" onSubmit={(event) => { event.preventDefault(); setError(''); setStep(2); }}>
          <div className="feedback-create-field">
            <label htmlFor="feedback-participant">Membro da equipe participante</label>
            <select id="feedback-participant" value={participantId} onChange={(event) => setParticipantId(event.target.value)} required disabled={isLoadingParticipants}>
              <option value="">{isLoadingParticipants ? 'Carregando membros...' : 'Selecione um membro'}</option>
              {participants.map((participant) => <option key={participant.id} value={participant.id}>{participant.name} ({participant.email})</option>)}
            </select>
          </div>
          <div className="feedback-create-field">
            <label htmlFor="feedback-objective">Objetivo do processo</label>
            <textarea id="feedback-objective" value={objective} onChange={(event) => setObjective(event.target.value)} maxLength={1000} rows={5} required />
            <span className="feedback-create-hint">Explique o que se pretende desenvolver ou avaliar.</span>
          </div>
          {error && <p className="feedback-create-error" role="alert">{error}</p>}
          <div className="feedback-create-actions">
            <button className="feedback-create-secondary" type="button" onClick={onBack}>Cancelar</button>
            <button className="feedback-create-button" type="submit">Continuar</button>
          </div>
        </form>
      ) : (
        <form className="feedback-create-form" onSubmit={(event) => { event.preventDefault(); void saveProcess('SENT_FOR_VALIDATION'); }}>
          <div className="feedback-create-period">
            <div className="feedback-create-field">
              <label htmlFor="feedback-start-date">Início</label>
              <input id="feedback-start-date" type="date" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required />
            </div>
            <div className="feedback-create-field">
              <label htmlFor="feedback-end-date">Término</label>
              <input id="feedback-end-date" type="date" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} required />
            </div>
          </div>
          <div className="feedback-create-field">
            <label htmlFor="feedback-criteria">Critérios de avaliação</label>
            <textarea id="feedback-criteria" value={criteria} onChange={(event) => setCriteria(event.target.value)} rows={5} placeholder="Um critério por linha" required />
            <span className="feedback-create-hint">Informe pelo menos um critério, cada um em uma linha.</span>
          </div>
          {error && <p className="feedback-create-error" role="alert">{error}</p>}
          <div className="feedback-create-actions">
            <button className="feedback-create-secondary" type="button" onClick={() => setStep(1)}>Voltar</button>
            <button className="feedback-create-secondary" type="button" disabled={isSaving} onClick={() => void saveProcess('DRAFT')}>{isSaving ? 'Salvando...' : 'Salvar rascunho'}</button>
            <button className="feedback-create-button" type="submit" disabled={isSaving}>{isSaving ? 'Enviando...' : 'Enviar para validação'}</button>
          </div>
        </form>
      )}
    </section>
  );
};

export default FeedbackProcessCreation;
import React, { useState } from 'react';
import axios from 'axios';
import feedbackProcessService from '../services/feedbackProcessService';
import type { FeedbackProcess } from '../services/feedbackProcessService';
import '../styles/FeedbackProcessCreation.css';

const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (message) return message;
  }
  return 'Não foi possível criar o processo. Tente novamente.';
};

const FeedbackProcessCreation: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [createdProcess, setCreatedProcess] =
    useState<FeedbackProcess | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      const process = await feedbackProcessService.create({
        title: title.trim(),
        description: description.trim() || undefined,
      });
      setCreatedProcess(process);
      setTitle('');
      setDescription('');
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  if (createdProcess) {
    return (
      <section className="feedback-create-panel" aria-labelledby="feedback-create-title">
        <p className="feedback-create-eyebrow">Processo registrado</p>
        <h2 id="feedback-create-title">{createdProcess.title}</h2>
        <p className="feedback-create-success" role="status">
          O processo foi criado com sucesso.
        </p>
        <button
          className="feedback-create-button"
          type="button"
          onClick={() => setCreatedProcess(null)}
        >
          Criar outro processo
        </button>
      </section>
    );
  }

  return (
    <section className="feedback-create-panel" aria-labelledby="feedback-create-title">
      <p className="feedback-create-eyebrow">Novo planejamento</p>
      <h2 id="feedback-create-title">Criar processo de feedback</h2>
      <p className="feedback-create-intro">
        Registre as informações iniciais do processo.
      </p>

      <form className="feedback-create-form" onSubmit={handleSubmit}>
        <div className="feedback-create-field">
          <label htmlFor="feedback-title">Nome do processo</label>
          <input
            id="feedback-title"
            name="title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            autoComplete="off"
            required
          />
          <span className="feedback-create-hint">Até 120 caracteres</span>
        </div>

        <div className="feedback-create-field">
          <label htmlFor="feedback-description">Descrição</label>
          <textarea
            id="feedback-description"
            name="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={1000}
            rows={4}
          />
          <span className="feedback-create-hint">
            Opcional, até 1000 caracteres
          </span>
        </div>

        {error && (
          <p className="feedback-create-error" role="alert">
            {error}
          </p>
        )}

        <button
          className="feedback-create-button"
          type="submit"
          disabled={isSaving}
        >
          {isSaving ? 'Criando...' : 'Criar processo'}
        </button>
      </form>
    </section>
  );
};

export default FeedbackProcessCreation;
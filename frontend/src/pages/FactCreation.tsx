import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import userService from "../services/userService";
import factService from "../services/factService";
import type { TeamMember } from "../types/team-member";
import "../styles/FactCreation.css";

const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (message) return message;
  }
  return "Não foi possível registrar o fato. Tente novamente.";
};

interface FactCreationProps {
  onSaved: () => void;
}

const FactCreation: React.FC<FactCreationProps> = ({ onSaved }) => {
  const [description, setDescription] = useState("");
  const [relatedUserId, setRelatedUserId] = useState("");
  const [participants, setParticipants] = useState<TeamMember[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    userService
      .listAvailableForFacts()
      .then(setParticipants)
      .catch((requestError: unknown) => setError(getErrorMessage(requestError)))
      .finally(() => setIsLoadingParticipants(false));
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);

    try {
      await factService.create(
        description,
        relatedUserId ? Number(relatedUserId) : null,
        files,
      );
      setDescription("");
      setRelatedUserId("");
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSuccess("Fato registrado com sucesso.");
      onSaved();
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="fact-create-panel" aria-labelledby="fact-create-title">
      <p className="fact-create-eyebrow">Registro de evidências</p>
      <h2 id="fact-create-title">Registrar fato para feedback</h2>
      <p className="fact-create-intro">
        Descreva o acontecimento e, se necessário, associe uma pessoa e anexe
        arquivos como evidência.
      </p>

      <form
        className="fact-create-form"
        onSubmit={(event) => void submit(event)}
      >
        <div className="fact-create-field">
          <label htmlFor="fact-related-user">Pessoa associada (opcional)</label>
          <select
            id="fact-related-user"
            value={relatedUserId}
            onChange={(event) => setRelatedUserId(event.target.value)}
            disabled={isLoadingParticipants || isSaving}
          >
            <option value="">Nenhuma pessoa selecionada</option>
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.name} ({participant.email})
              </option>
            ))}
          </select>
        </div>

        <div className="fact-create-field">
          <label htmlFor="fact-description">Descrição do fato</label>
          <textarea
            id="fact-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={5000}
            rows={7}
            placeholder="Descreva o que aconteceu, quando e em qual contexto."
            required
            disabled={isSaving}
          />
          <span className="fact-create-hint">
            A descrição é obrigatória. São aceitos documentos, imagens e vídeos
            como evidência.
          </span>
        </div>

        <div className="fact-create-field">
          <label htmlFor="fact-attachments">Anexos (opcionais)</label>
          <input
            id="fact-attachments"
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            disabled={isSaving}
          />
          <span className="fact-create-hint">
            Você pode enviar até 10 arquivos, com no máximo 50 MB cada.
          </span>
          {files.length > 0 && (
            <ul className="fact-file-list">
              {files.map((file) => (
                <li key={`${file.name}-${file.lastModified}`}>
                  <span>{file.name}</span>
                  <small>{Math.ceil(file.size / 1024)} KB</small>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <p className="fact-create-error" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="fact-create-success" role="status">
            {success}
          </p>
        )}

        <div className="fact-create-actions">
          <button
            className="fact-create-button"
            type="submit"
            disabled={isSaving}
          >
            {isSaving ? "Registrando..." : "Confirmar registro"}
          </button>
        </div>
      </form>
    </section>
  );
};

export default FactCreation;

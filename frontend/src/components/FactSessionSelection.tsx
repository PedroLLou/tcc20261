import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import factService from "../services/factService";
import type { Fact } from "../types/fact";
import "../styles/FactSessionSelection.css";

interface FactSessionSelectionProps {
  sessionId: number;
}

const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (message) return message;
  }
  return "Não foi possível consultar os fatos disponíveis.";
};

const FactSessionSelection: React.FC<FactSessionSelectionProps> = ({
  sessionId,
}) => {
  const [facts, setFacts] = useState<Fact[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadFacts = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const page = await factService.listAvailableForSession(sessionId);
      setFacts(page.items);
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadFacts(), 0);
    return () => window.clearTimeout(timer);
  }, [loadFacts]);

  const toggleFact = (factId: number) => {
    setSelectedIds((ids) =>
      ids.includes(factId)
        ? ids.filter((id) => id !== factId)
        : [...ids, factId],
    );
  };

  const selectFacts = async () => {
    if (selectedIds.length === 0) return;
    setIsSaving(true);
    setError("");
    setSuccess("");
    try {
      await factService.selectForSession(sessionId, selectedIds);
      setSelectedIds([]);
      setSuccess("Fatos associados à sessão com sucesso.");
      await loadFacts();
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section
      className="fact-session-selection"
      aria-labelledby={`facts-title-${sessionId}`}
    >
      <h3 id={`facts-title-${sessionId}`}>Fatos e evidências da sessão</h3>
      {isLoading ? (
        <p>Carregando fatos disponíveis...</p>
      ) : facts.length === 0 ? (
        <p>Nenhum fato disponível para esta sessão.</p>
      ) : (
        <ul className="fact-session-list">
          {facts.map((fact) => (
            <li key={fact.id}>
              <label>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(fact.id)}
                  onChange={() => toggleFact(fact.id)}
                  disabled={isSaving}
                />
                <span>
                  <strong>{fact.description}</strong>
                  <small>
                    {fact.attachments.length} anexo(s) ·{" "}
                    {new Date(fact.recordedAt).toLocaleDateString("pt-BR")}
                  </small>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className="process-list-error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="process-list-notice" role="status">
          {success}
        </p>
      )}
      {selectedIds.length > 0 && (
        <button
          className="process-create-button"
          type="button"
          onClick={() => void selectFacts()}
          disabled={isSaving}
        >
          {isSaving
            ? "Associando..."
            : `Associar ${selectedIds.length} fato(s)`}
        </button>
      )}
    </section>
  );
};

export default FactSessionSelection;

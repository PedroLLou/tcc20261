import React, { useEffect, useState } from 'react';
import authService from '../services/authService';
import type { Team } from '../services/authService';
import '../styles/FeedbackProcessCreation.css';

interface Props { onBack: () => void; }

const TeamManagement: React.FC<Props> = ({ onBack }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deletingTeamId, setDeletingTeamId] = useState<number | null>(null);

  useEffect(() => { void authService.listTeams().then(setTeams).catch(() => setError('Não foi possível carregar as equipes.')); }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const team = await authService.createTeam(name);
      setTeams((current) => [...current, team].sort((a, b) => a.name.localeCompare(b.name)));
      setName('');
      setMessage(`Equipe ${team.name} criada com sucesso.`);
    } catch {
      setError('Não foi possível criar a equipe. Verifique se o nome já existe.');
    }
  };

  const removeTeam = async (team: Team) => {
    if (!window.confirm(`Excluir a equipe ${team.name}?`)) return;
    setError('');
    setMessage('');
    setDeletingTeamId(team.id);
    try {
      await authService.deleteTeam(team.id);
      setTeams((current) => current.filter((item) => item.id !== team.id));
      setMessage(`Equipe ${team.name} excluída.`);
    } catch (requestError: unknown) {
      const apiMessage = requestError && typeof requestError === 'object' && 'response' in requestError
        ? (requestError as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      setError(apiMessage ?? 'Não foi possível excluir a equipe.');
    } finally {
      setDeletingTeamId(null);
    }
  };

  return (
    <section className="feedback-create-panel management-create-panel">
      <button className="management-back-button" type="button" onClick={onBack}>Voltar ao painel</button>
      <p className="feedback-create-eyebrow">Organização</p>
      <h2>Equipes</h2>
      <p className="feedback-create-intro">Crie equipes para vincular membros e líderes durante o cadastro.</p>
      <form className="feedback-create-form" onSubmit={(event) => void submit(event)}>
        <div className="feedback-create-field"><label htmlFor="team-name">Nome da equipe</label><input id="team-name" value={name} onChange={(event) => setName(event.target.value)} required placeholder="Ex.: Desenvolvimento" /></div>
        {error && <p className="process-list-error" role="alert">{error}</p>}
        {message && <p className="user-form-message" role="status">{message}</p>}
        <button className="feedback-create-button" type="submit">Criar equipe</button>
      </form>
      <div className="managed-team-list">
        <h3>Equipes cadastradas</h3>
        {teams.length ? <ul>{teams.map((team) => <li key={team.id}>
          <span>{team.name}{typeof team._count?.users === 'number' ? ` · ${team._count.users} usuário(s)` : ''}</span>
          <button type="button" className="managed-delete-button" disabled={deletingTeamId === team.id} onClick={() => void removeTeam(team)}>{deletingTeamId === team.id ? 'Excluindo...' : 'Excluir'}</button>
        </li>)}</ul> : <p>Nenhuma equipe cadastrada.</p>}
      </div>
    </section>
  );
};

export default TeamManagement;

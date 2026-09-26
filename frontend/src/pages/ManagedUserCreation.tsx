import React, { useEffect, useState } from 'react';
import authService from '../services/authService';
import type { Team, ManagedUser, CreateManagedUserRequest } from '../services/authService';
import '../styles/FeedbackProcessCreation.css';

interface Props { onBack: () => void; currentUserId: number; }

const ManagedUserCreation: React.FC<Props> = ({ onBack, currentUserId }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [form, setForm] = useState({ name: '', age: '', email: '', password: '', role: 'ADMIN_LEADER' as CreateManagedUserRequest['role'], teamId: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void Promise.all([authService.listTeams(), authService.listManagedUsers()])
      .then(([teamList, userList]) => { setTeams(teamList); setUsers(userList); })
      .catch(() => setError('Não foi possível carregar usuários e equipes.'));
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const data: CreateManagedUserRequest = {
        ...form,
        age: Number(form.age),
        teamId: form.role === 'ADMIN_RH' ? null : Number(form.teamId),
      };
      const created = await authService.createManagedUser(data);
      setUsers(await authService.listManagedUsers());
      setMessage(`Conta de ${created.name} criada com sucesso.`);
      setForm({ name: '', age: '', email: '', password: '', role: 'ADMIN_LEADER', teamId: '' });
    } catch {
      setError('Não foi possível criar a conta. Verifique os dados e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async (user: ManagedUser) => {
    if (!window.confirm(`Excluir a conta de ${user.name}? Os processos de feedback criados por essa pessoa também serão excluídos.`)) return;
    setError('');
    try {
      await authService.deleteManagedUser(user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setMessage(`Conta de ${user.name} excluída.`);
    } catch (requestError: unknown) {
      const message = requestError && typeof requestError === 'object' && 'response' in requestError
        ? (requestError as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      setError(message ?? 'Não foi possível excluir essa conta.');
    }
  };

  return (
    <section className="feedback-create-panel management-create-panel">
      <button className="management-back-button" type="button" onClick={onBack}>Voltar ao painel</button>
      <p className="feedback-create-eyebrow">Acessos</p>
      <h2>Criar usuário</h2>
      <p className="feedback-create-intro">Cadastre um novo membro, líder de equipe ou administrador de RH.</p>
      <form className="feedback-create-form" onSubmit={(event) => void submit(event)}>
        <div className="management-form-grid">
          <div className="feedback-create-field"><label htmlFor="managed-name">Nome completo</label><input id="managed-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></div>
          <div className="feedback-create-field"><label htmlFor="managed-age">Idade</label><input id="managed-age" type="number" min="1" value={form.age} onChange={(event) => setForm({ ...form, age: event.target.value })} required /></div>
          <div className="feedback-create-field"><label htmlFor="managed-email">Email</label><input id="managed-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></div>
          <div className="feedback-create-field"><label htmlFor="managed-password">Senha inicial</label><input id="managed-password" type="password" minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></div>
          <div className="feedback-create-field"><label htmlFor="managed-role">Perfil de acesso</label><select id="managed-role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as CreateManagedUserRequest['role'] })}><option value="TEAM_MEMBER">Membro da equipe</option><option value="ADMIN_LEADER">Líder de equipe</option><option value="ADMIN_RH">Admin - RH</option></select></div>
          {form.role !== 'ADMIN_RH' && <div className="feedback-create-field"><label htmlFor="managed-team">Equipe</label><select id="managed-team" value={form.teamId} onChange={(event) => setForm({ ...form, teamId: event.target.value })} required><option value="">Selecione uma equipe</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select>{teams.length === 0 && <span className="feedback-create-hint">Crie uma equipe antes de cadastrar membros ou líderes.</span>}</div>}
        </div>
        {error && <p className="process-list-error" role="alert">{error}</p>}
        {message && <p className="user-form-message" role="status">{message}</p>}
        <button className="feedback-create-button" type="submit" disabled={saving || (form.role !== 'ADMIN_RH' && teams.length === 0)}>{saving ? 'Criando...' : 'Criar usuário'}</button>
      </form>
      <div className="managed-user-list">
        <h3>Usuários cadastrados</h3>
        {users.length ? <ul>{users.map((managedUser) => <li key={managedUser.id}>
          <div><strong>{managedUser.name}</strong><span>{managedUser.email}</span><small>{managedUser.role === 'ADMIN_RH' ? 'Admin RH' : managedUser.role === 'ADMIN_LEADER' ? `Líder · ${managedUser.team?.name ?? 'Sem equipe'}` : `Membro · ${managedUser.team?.name ?? 'Sem equipe'}`}</small></div>
          {managedUser.id !== currentUserId && <button type="button" className="managed-delete-button" onClick={() => void removeUser(managedUser)}>Excluir</button>}
        </li>)}</ul> : <p>Nenhum usuário cadastrado.</p>}
      </div>
    </section>
  );
};

export default ManagedUserCreation;

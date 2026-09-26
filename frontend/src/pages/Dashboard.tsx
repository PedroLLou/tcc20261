import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import authService from '../services/authService';
import type { CreateManagedUserRequest } from '../services/authService';
import FeedbackProcessCreation from './FeedbackProcessCreation';
import feedbackProcessService from '../services/feedbackProcessService';
import type { FeedbackProcess } from '../services/feedbackProcessService';
import '../styles/Dashboard.css';

type ManagedUserFormState = Omit<CreateManagedUserRequest, 'age'> & {
  age: string;
};

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [processes, setProcesses] = useState<FeedbackProcess[]>([]);
  const [isLoadingProcesses, setIsLoadingProcesses] = useState(true);
  const [processError, setProcessError] = useState('');
  const [deletingProcessId, setDeletingProcessId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<FeedbackProcess | null>(null);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userFormError, setUserFormError] = useState('');
  const [userFormMessage, setUserFormMessage] = useState('');
  const [newUser, setNewUser] = useState<ManagedUserFormState>({
    name: '',
    age: '',
    email: '',
    password: '',
    role: 'ADMIN_LEADER',
  });

  const canAccessFeedbackProcesses =
    user?.role === 'ADMIN_LEADER' || user?.role === 'ADMIN_RH';
  const canCreateFeedbackProcess = user?.role === 'ADMIN_LEADER';

  useEffect(() => {
    if (!canAccessFeedbackProcesses) return;
    feedbackProcessService
      .list()
      .then(setProcesses)
      .catch(() => setProcessError('Não foi possível carregar os processos.'))
      .finally(() => setIsLoadingProcesses(false));
  }, [canAccessFeedbackProcesses]);

  const refreshProcesses = async () => {
    try {
      setProcesses(await feedbackProcessService.list());
      setProcessError('');
    } catch {
      setProcessError('O planejamento foi salvo, mas a lista não pôde ser atualizada.');
    }
  };

  const deleteProcess = async (process: FeedbackProcess) => {
    const participantName = process.participant?.name ?? 'este participante';
    if (!window.confirm(`Excluir o planejamento de ${participantName}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setDeletingProcessId(process.id);
    setProcessError('');
    try {
      await feedbackProcessService.remove(process.id);
      setProcesses((current) => current.filter((item) => item.id !== process.id));
      if (selectedProcess?.id === process.id) setSelectedProcess(null);
    } catch {
      setProcessError('Não foi possível excluir o planejamento. Tente novamente.');
    } finally {
      setDeletingProcessId(null);
    }
  };

  const createManagedUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreatingUser(true);
    setUserFormError('');
    setUserFormMessage('');
    try {
      const createdUser = await authService.createManagedUser({
        ...newUser,
        age: Number(newUser.age),
      });
      setUserFormMessage(`Conta de ${createdUser.name} criada com sucesso.`);
      setNewUser({
        name: '',
        age: '',
        email: '',
        password: '',
        role: 'ADMIN_LEADER',
      });
      setIsUserFormOpen(false);
    } catch {
      setUserFormError('Não foi possível criar a conta. Verifique os dados e tente novamente.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Deseja realmente sair?')) {
      logout();
    }
  };

  const getRoleName = (role: string) => {
    const roles: { [key: string]: string } = {
      ADMIN_LEADER: 'Admin - Líder',
      TEAM_MEMBER: 'Usuário',
      ADMIN_RH: 'Admin - RH',
    };
    return roles[role] || role;
  };

  const getStatusLabel = (status: FeedbackProcess['status']) => {
    const labels: Record<FeedbackProcess['status'], string> = {
      DRAFT: 'Rascunho',
      SENT_FOR_VALIDATION: 'Enviado para validação',
      PLANNED: 'Planejado',
    };
    return labels[status];
  };

  const renderContent = () => {
    if (!user) return null;

    switch (user.role) {
      case 'ADMIN_LEADER':
        return (
          <>
            <h2>Painel do Líder de Equipe</h2>
            <div className="dashboard-workspace">
              {renderReportsPanel()}
              {renderProcessPanel()}
            </div>
          </>
        );

      case 'TEAM_MEMBER':
        return (
          <h2>Painel do Membro da Equipe</h2>
        );

      case 'ADMIN_RH':
        return (
          <>
            <h2>Painel de Administração de RH</h2>
            <div className="dashboard-workspace">
              {renderReportsPanel()}
              {renderProcessPanel()}
            </div>
            {renderUserManagementPanel()}
          </>
        );

      default:
        return <div>Acesso não autorizado</div>;
    }
  };

  const renderUserManagementPanel = () => (
    <section className="user-management-panel" aria-labelledby="user-management-title">
      <div className="user-management-heading">
        <div>
          <p className="process-panel-eyebrow">Acessos</p>
          <h3 id="user-management-title">Usuários</h3>
        </div>
        <button
          className="user-management-toggle"
          type="button"
          onClick={() => {
            setIsUserFormOpen((isOpen) => !isOpen);
            setUserFormError('');
            setUserFormMessage('');
          }}
        >
          {isUserFormOpen ? 'Cancelar' : 'Criar usuário'}
        </button>
      </div>
      {userFormMessage && <p className="user-form-message" role="status">{userFormMessage}</p>}
      {userFormError && <p className="process-list-error" role="alert">{userFormError}</p>}
      {isUserFormOpen && (
        <form className="user-create-form" onSubmit={(event) => void createManagedUser(event)}>
          <div className="user-create-field">
            <label htmlFor="managed-user-name">Nome completo</label>
            <input id="managed-user-name" value={newUser.name} onChange={(event) => setNewUser({ ...newUser, name: event.target.value })} required />
          </div>
          <div className="user-create-field">
            <label htmlFor="managed-user-age">Idade</label>
            <input id="managed-user-age" type="number" min="1" value={newUser.age} onChange={(event) => setNewUser({ ...newUser, age: event.target.value })} required />
          </div>
          <div className="user-create-field">
            <label htmlFor="managed-user-email">Email</label>
            <input id="managed-user-email" type="email" value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} required />
          </div>
          <div className="user-create-field">
            <label htmlFor="managed-user-password">Senha inicial</label>
            <input id="managed-user-password" type="password" minLength={8} value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} required />
          </div>
          <div className="user-create-field">
            <label htmlFor="managed-user-role">Perfil de acesso</label>
            <select id="managed-user-role" value={newUser.role} onChange={(event) => setNewUser({ ...newUser, role: event.target.value as CreateManagedUserRequest['role'] })}>
              <option value="TEAM_MEMBER">Membro da equipe</option>
              <option value="ADMIN_LEADER">Admin - Líder de equipe</option>
              <option value="ADMIN_RH">Admin - RH</option>
            </select>
          </div>
          <button className="user-management-toggle" type="submit" disabled={isCreatingUser}>
            {isCreatingUser ? 'Criando...' : 'Criar conta'}
          </button>
        </form>
      )}
    </section>
  );

  const renderReportsPanel = () => (
    <section className="report-panel" aria-labelledby="reports-panel-title">
      <div className="report-panel-heading">
        <div>
          <p className="process-panel-eyebrow">Visão geral</p>
          <h3 id="reports-panel-title">Relatórios</h3>
        </div>
        <span className="work-in-progress">Em desenvolvimento</span>
      </div>
      <div className="report-panel-space" aria-hidden="true" />
    </section>
  );

  const renderProcessPanel = () => {
    return (
      <section className="process-panel" aria-labelledby="process-panel-title">
        <div className="process-panel-heading">
          <div>
            <p className="process-panel-eyebrow">Planejamento</p>
            <h3 id="process-panel-title">Processos de feedback</h3>
          </div>
          {canCreateFeedbackProcess && (
            <button className="process-create-button" type="button" onClick={() => setIsCreating(true)}>
              Criar novo planejamento
            </button>
          )}
        </div>
        {processError && <p className="process-list-error" role="alert">{processError}</p>}
        {isLoadingProcesses ? (
          <p className="process-list-empty">Carregando processos...</p>
        ) : processes.length === 0 ? (
          <p className="process-list-empty">Ainda não há planejamentos.</p>
        ) : (
          <ul className="process-list">
            {processes.map((process) => (
              <li className="process-list-item" key={process.id}>
                <button
                  className="process-list-open"
                  type="button"
                  onClick={() => setSelectedProcess(process)}
                  aria-label={`Consultar planejamento de ${process.participant?.name ?? 'participante'}`}
                >
                  <span className="process-list-participant">{process.participant?.name ?? 'Participante não definido'}</span>
                  <span className="process-list-objective">{process.objective || 'Objetivo não definido'}</span>
                  <span className="process-list-meta">
                    {process.startsAt ? process.startsAt.slice(0, 10) : 'Sem início'}
                    {process.endsAt ? ` a ${process.endsAt.slice(0, 10)}` : ''}
                    <span className={`feedback-status feedback-status-${process.status.toLowerCase().replace('_', '-')}`}>{getStatusLabel(process.status)}</span>
                  </span>
                </button>
                <button
                  className="process-delete-button"
                  type="button"
                  disabled={deletingProcessId === process.id}
                  onClick={() => void deleteProcess(process)}
                  aria-label={`Excluir planejamento de ${process.participant?.name ?? 'participante'}`}
                >
                  {deletingProcessId === process.id ? 'Excluindo...' : 'Excluir'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  };

  const isPlanningScreen =
    canAccessFeedbackProcesses &&
    (selectedProcess !== null || (canCreateFeedbackProcess && isCreating));

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Sistema</h1>
        <div className="header-info">
          <div className="user-info">
            <p className="user-name">{user?.name}</p>
            <p className="user-role">{getRoleName(user?.role || '')}</p>
          </div>
          <button onClick={handleLogout} className="logout-button">
            Sair
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className={`dashboard-content${isPlanningScreen ? ' dashboard-content-planning' : ''}`}>
          {isPlanningScreen && user ? (
            <FeedbackProcessCreation
              key={selectedProcess?.id ?? 'new-process'}
              initialProcess={selectedProcess}
              userId={user.id}
              userRole={user.role === 'ADMIN_RH' ? 'ADMIN_RH' : 'ADMIN_LEADER'}
              onBack={() => {
                setIsCreating(false);
                setSelectedProcess(null);
              }}
              onSaved={async () => {
                await refreshProcesses();
                setIsCreating(false);
                setSelectedProcess(null);
              }}
            />
          ) : renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

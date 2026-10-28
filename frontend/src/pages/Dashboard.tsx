import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useFeedbackProcesses } from '../hooks/useFeedbackProcesses';
import FeedbackProcessCreation from './FeedbackProcessCreation';
import ManagedUserCreation from './ManagedUserCreation';
import TeamManagement from './TeamManagement';
import FactCreation from './FactCreation';
import feedbackSessionService from '../services/feedbackSessionService';
import type { FeedbackProcess } from '../types/feedback-process';
import { ProcessPanel, ReportsPanel } from '../components/DashboardPanels';
import AppHeader from '../components/AppHeader';
import SideNav from '../components/SideNav';
import type { SideNavItem } from '../components/SideNav';
import '../styles/Dashboard.css';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [deletingProcessId, setDeletingProcessId] = useState<number | null>(null);
  const [processActionError, setProcessActionError] = useState('');
  const [creatingSessionProcessIds, setCreatingSessionProcessIds] = useState<number[]>([]);
  const [sessionNotice, setSessionNotice] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<FeedbackProcess | null>(null);
  const [managementScreen, setManagementScreen] = useState<
    'users' | 'teams' | 'facts' | null
  >(null);
  const [isMenuOpen, setIsMenuOpen] = useState(() => window.innerWidth > 700);

  const canAccessFeedbackProcesses =
    user?.role === 'ADMIN_LEADER' || user?.role === 'ADMIN_RH';
  const canCreateFeedbackProcess = user?.role === 'ADMIN_LEADER';
  const {
    processes,
    isLoading: isLoadingProcesses,
    error: processError,
    reload: reloadProcesses,
    remove: removeProcess,
  } = useFeedbackProcesses(canAccessFeedbackProcesses);

  const refreshProcesses = async () => {
    await reloadProcesses();
  };

  const deleteProcess = async (process: FeedbackProcess) => {
    const participantName = process.participant?.name ?? 'este participante';
    if (!window.confirm(`Excluir o planejamento de ${participantName}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setDeletingProcessId(process.id);
    setProcessActionError('');
    try {
      await removeProcess(process.id);
      if (selectedProcess?.id === process.id) setSelectedProcess(null);
    } catch {
      setProcessActionError('Não foi possível excluir o planejamento. Tente novamente.');
    } finally {
      setDeletingProcessId(null);
    }
  };

  const createSession = async (process: FeedbackProcess) => {
    setCreatingSessionProcessIds((ids) => [...ids, process.id]);
    setProcessActionError('');
    setSessionNotice('');
    try {
      await feedbackSessionService.create(process.id);
      setSessionNotice('Sessão de feedback criada.');
    } catch {
      setProcessActionError('Não foi possível criar a sessão. Tente novamente.');
    } finally {
      setCreatingSessionProcessIds((ids) => ids.filter((id) => id !== process.id));
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

  const renderContent = () => {
    if (!user) return null;

    switch (user.role) {
      case 'ADMIN_LEADER':
        return (
          <>
            <h2>Painel do Líder de Equipe</h2>
            <div className="dashboard-workspace">
              <ReportsPanel />
              <ProcessPanel
                processes={processes}
                isLoading={isLoadingProcesses}
                error={processError || processActionError}
                canCreate={canCreateFeedbackProcess}
                deletingProcessId={deletingProcessId}
                notice={sessionNotice}
                currentUserId={user.id}
                creatingSessionProcessIds={creatingSessionProcessIds}
                onCreate={() => setIsCreating(true)}
                onSelect={setSelectedProcess}
                onDelete={(process) => void deleteProcess(process)}
                onCreateSession={(process) => void createSession(process)}
              />
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
              <ReportsPanel />
              <ProcessPanel
                processes={processes}
                isLoading={isLoadingProcesses}
                error={processError || processActionError}
                canCreate={canCreateFeedbackProcess}
                deletingProcessId={deletingProcessId}
                onCreate={() => setIsCreating(true)}
                onSelect={setSelectedProcess}
                onDelete={(process) => void deleteProcess(process)}
              />
            </div>
          </>
        );

      default:
        return <div>Acesso não autorizado</div>;
    }
  };

  const isPlanningScreen =
    canAccessFeedbackProcesses &&
    (selectedProcess !== null || (canCreateFeedbackProcess && isCreating));
  const isManagementScreen =
    user?.role === 'ADMIN_RH' &&
    (managementScreen === 'users' || managementScreen === 'teams');
  const isFactScreen = managementScreen === 'facts';

  const navItems: SideNavItem[] = [
    { key: 'panel', label: 'Painel' },
    { key: 'facts', label: 'Registrar fato' },
  ];
  if (user?.role === 'ADMIN_RH') {
    navItems.push({ key: 'users', label: 'Usuários' }, { key: 'teams', label: 'Equipes' });
  }
  if (canCreateFeedbackProcess) {
    navItems.push({ key: 'new-planning', label: 'Novo planejamento' });
  }

  const activeNavKey = isManagementScreen
    ? (managementScreen as string)
    : isFactScreen
      ? 'facts'
    : isPlanningScreen && selectedProcess === null
      ? 'new-planning'
      : 'panel';

  const handleNavSelect = (key: string) => {
    setSelectedProcess(null);
    setIsCreating(key === 'new-planning');
    setManagementScreen(key === 'users' || key === 'teams' || key === 'facts' ? key : null);
  };

  return (
    <div className="dashboard-container">
      <AppHeader
        userName={user?.name}
        roleLabel={getRoleName(user?.role || '')}
        isMenuOpen={isMenuOpen}
        onToggleMenu={() => setIsMenuOpen((open) => !open)}
        onLogout={handleLogout}
      />

      <div className="app-body">
        {isMenuOpen && (
          <SideNav items={navItems} activeKey={activeNavKey} onSelect={handleNavSelect} />
        )}

        <main className="dashboard-main">
          <div className={`dashboard-content${isPlanningScreen || isManagementScreen ? ' dashboard-content-planning' : ''}`}>
            {isFactScreen ? (
              <FactCreation onSaved={() => undefined} />
            ) : isManagementScreen && managementScreen === 'users' ? (
              <ManagedUserCreation currentUserId={user.id} />
            ) : isManagementScreen && managementScreen === 'teams' ? (
              <TeamManagement />
            ) : isPlanningScreen && user ? (
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
    </div>
  );
};

export default Dashboard;

import React from 'react';
import { useAuth } from '../hooks/useAuth';
import FeedbackProcessCreation from './FeedbackProcessCreation';
import '../styles/Dashboard.css';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();

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

  const canCreateFeedbackProcess =
    user?.role === 'ADMIN_LEADER' || user?.role === 'ADMIN_RH';

  const renderContent = () => {
    if (!user) return null;

    switch (user.role) {
      case 'ADMIN_LEADER':
        return (
          <h2>Painel do Líder de Equipe</h2>
        );

      case 'TEAM_MEMBER':
        return (
          <h2>Painel do Membro da Equipe</h2>
        );

      case 'ADMIN_RH':
        return (
          <h2>Painel de Administração de RH</h2>
        );

      default:
        return <div>Acesso não autorizado</div>;
    }
  };

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
        <div className="dashboard-content">
          {renderContent()}
          {canCreateFeedbackProcess && <FeedbackProcessCreation />}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

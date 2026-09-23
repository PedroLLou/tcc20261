import React from 'react';
import { useAuth } from '../hooks/useAuth';
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

  const renderContent = () => {
    if (!user) return null;

    switch (user.role) {
      case 'ADMIN_LEADER':
        return (
          <div className="dashboard-content">
            <h2>Painel do Líder de Equipe</h2>
          </div>
        );

      case 'TEAM_MEMBER':
        return (
          <div className="dashboard-content">
            <h2>Painel do Membro da Equipe</h2>
          </div>
        );

      case 'ADMIN_RH':
        return (
          <div className="dashboard-content">
            <h2>Painel de Administração de RH</h2>
          </div>
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
        {renderContent()}
      </main>
    </div>
  );
};

export default Dashboard;

import React, { useEffect, useRef, useState } from 'react';

interface AppHeaderProps {
  userName?: string;
  roleLabel: string;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onLogout: () => void;
}

const getInitials = (name?: string) => {
  const initials = (name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
  return initials || '?';
};

const AppHeader: React.FC<AppHeaderProps> = ({
  userName,
  roleLabel,
  isMenuOpen,
  onToggleMenu,
  onLogout,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isUserMenuOpen) return undefined;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsUserMenuOpen(false);
    };
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('mousedown', closeOnOutsideClick);
    };
  }, [isUserMenuOpen]);

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    onLogout();
  };

  return (
    <header className="dashboard-header">
      <div className="header-start">
        <button
          type="button"
          className="menu-toggle"
          aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={isMenuOpen}
          onClick={onToggleMenu}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M4 6h16M4 12h16M4 18h16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </button>
      </div>

      <h1>Sistema de Gerenciamento de Feedbacks</h1>

      <div className="user-menu" ref={userMenuRef}>
        <button
          type="button"
          className="user-menu-button"
          aria-haspopup="menu"
          aria-expanded={isUserMenuOpen}
          onClick={() => setIsUserMenuOpen((open) => !open)}
        >
          <span className="user-avatar" aria-hidden="true">
            {getInitials(userName)}
          </span>
          <span className="user-info">
            <span className="user-name">{userName}</span>
            <span className="user-role">{roleLabel}</span>
          </span>
          <span className="user-menu-chevron" aria-hidden="true">
            ▾
          </span>
        </button>
        {isUserMenuOpen && (
          <div className="user-menu-list" role="menu">
            <button type="button" role="menuitem" className="user-menu-item" onClick={handleLogout}>
              Sair
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default AppHeader;

import React from 'react';

export interface SideNavItem {
  key: string;
  label: string;
}

interface SideNavProps {
  items: SideNavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
}

const SideNav: React.FC<SideNavProps> = ({ items, activeKey, onSelect }) => (
  <nav className="side-nav" aria-label="Navegação principal">
    <ul>
      {items.map((item) => (
        <li key={item.key}>
          <button
            type="button"
            className="side-nav-item"
            aria-current={item.key === activeKey ? 'page' : undefined}
            onClick={() => onSelect(item.key)}
          >
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  </nav>
);

export default SideNav;

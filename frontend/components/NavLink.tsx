
import React, { ReactNode } from 'react';
import { NavLink as RouterNavLink } from 'react-router-dom';

interface NavLinkProps {
  to: string;
  children: ReactNode;
}

const NavLink: React.FC<NavLinkProps> = ({ to, children }) => {
  return (
    <RouterNavLink
      to={to}
      className={({ isActive }) =>
        `text-sm font-medium transition-colors ${
          isActive
            ? 'text-brand-primary'
            : 'text-slate-300 hover:text-white'
        }`
      }
    >
      {children}
    </RouterNavLink>
  );
};

export default NavLink;

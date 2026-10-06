import React from 'react';
import { usePermission } from '../hooks/usePermission';

interface AuthorizedProps {
  permission?: string | string[];
  role?: string | string[];
  children: React.ReactNode;
}

export const Authorized: React.FC<AuthorizedProps> = ({ permission, role, children }) => {
  const { hasPermi, hasRole } = usePermission();

  if (permission && !hasPermi(permission)) {
    return null;
  }

  if (role && !hasRole(role)) {
    return null;
  }

  return <>{children}</>;
};

export default Authorized;

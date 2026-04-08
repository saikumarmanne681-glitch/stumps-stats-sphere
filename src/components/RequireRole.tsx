import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

type AllowedRole = 'admin' | 'player' | 'management' | 'team';

interface RequireRoleProps {
  children: ReactNode;
  allow: AllowedRole[];
}

export function RequireRole({ children, allow }: RequireRoleProps) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.type)) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

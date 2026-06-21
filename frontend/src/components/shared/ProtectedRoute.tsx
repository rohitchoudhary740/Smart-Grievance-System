import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import { UserRole } from '../../types';
import { PageLoader } from '../ui/Loader';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const location = useLocation();

  if (isLoading) return <PageLoader />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to their correct dashboard
    const roleHome: Record<UserRole, string> = {
      [UserRole.CITIZEN]:     '/citizen/dashboard',
      [UserRole.OFFICER]:     '/officer/dashboard',
      [UserRole.DEPT_HEAD]:   '/officer/dashboard',
      [UserRole.ADMIN]:       '/admin/dashboard',
      [UserRole.SUPER_ADMIN]: '/admin/dashboard',
    };
    return <Navigate to={roleHome[user.role]} replace />;
  }

  return <>{children}</>;
}

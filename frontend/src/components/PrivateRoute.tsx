import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, requireAdmin = false }) => {
  // Allow bypass for end-to-end tests when VITE_TEST_E2E is truthy
  const isE2E = typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_TEST_E2E === 'true';
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // If running E2E test mode, bypass auth and allow access
    if (isE2E) return <>{children}</>;
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && user?.role !== 'ADMIN') {
    // Redirect to unauthorized page or dashboard
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
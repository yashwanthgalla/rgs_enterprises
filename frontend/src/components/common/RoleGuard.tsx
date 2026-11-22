import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldX } from 'lucide-react';
import { Button } from '../ui/Button';

interface RoleGuardProps {
  allowedRoles: ('ADMIN' | 'MANAGER' | 'VIEWER')[];
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = (user.role || 'ADMIN').toUpperCase() as 'ADMIN' | 'MANAGER' | 'VIEWER';

  if (!allowedRoles.includes(userRole)) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shadow-apple-sm">
          <ShieldX className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Access Restricted</h2>
          <p className="text-xs text-gray-500 mt-1 max-w-sm">
            Your current role (<strong className="text-gray-700">{userRole}</strong>) does not have permission to view or manage this database table.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/')}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return <>{children}</>;
};

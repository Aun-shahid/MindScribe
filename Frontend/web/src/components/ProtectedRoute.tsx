// src/components/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Force onboarding / profile completion for therapists
  if (user && user.user_type === 'therapist') {
    const therapistUser = user as any;
    const isPending =
      therapistUser.specialization === 'PENDING' ||
      (therapistUser.license_number && typeof therapistUser.license_number === 'string' && therapistUser.license_number.startsWith('PENDING'));

    if (isPending && location.pathname !== '/profile') {
      return (
        <Navigate
          to="/profile"
          replace
          state={{
            warningBanner: 'Please complete your profile (specialization or license number) before accessing other features.',
          }}
        />
      );
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
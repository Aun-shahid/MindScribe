// src/components/Layout.tsx
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  const navLinkClass = (path: string) => 
    `px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
      isActive(path)
        ? 'bg-blue-700 text-white'
        : 'text-blue-100 hover:bg-blue-600 hover:text-white'
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-blue-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/dashboard" className="flex-shrink-0">
                <h1 className="text-xl font-bold text-white">MindScribe</h1>
              </Link>
              <div className="hidden md:block ml-10">
                <div className="flex items-baseline space-x-4">
                  <Link to="/dashboard" className={navLinkClass('/dashboard')}>
                    Dashboard
                  </Link>
                  <Link to="/sessions" className={navLinkClass('/sessions')}>
                    Sessions
                  </Link>
                  <Link to="/patients" className={navLinkClass('/patients')}>
                    Patients
                  </Link>
                  <Link to="/qr-code" className={navLinkClass('/qr-code')}>
                    QR Code
                  </Link>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:block">
                <span className="text-blue-100 text-sm">
                  Welcome, {user?.username}
                </span>
              </div>
              <Link 
                to="/profile" 
                className="text-blue-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Profile
              </Link>
              <button
                onClick={logout}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
// src/components/Layout.tsx
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Bell, Brain } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import NotificationToast from './NotificationToast';

const Layout = () => {
  const { logout } = useAuth();
  const location = useLocation();
  const { unreadCount, toasts, dismissToast } = useNotifications();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  const navLinkClass = (path: string) =>
    `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive(path)
        ? 'bg-white/20 backdrop-blur-sm text-white shadow-lg'
        : 'text-purple-100 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      {/* Enhanced Professional Navbar with Purple Theme */}
      <nav className="bg-gradient-to-r from-purple-900 via-purple-900 to-purple-900 shadow-xl border-b border-purple-500/20">
        <div className="w-[96%] lg:w-[94%] mx-auto px-[1%]">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Logo Section */}
              <Link to="/dashboard" className="flex-shrink-0 group">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center gap-2">
              <Brain className="text-purple-400" size={32} />
              <span className="text-2xl text-purple-200 font-bold">MindScribe</span>
            </div>
                </div>
              </Link>

              {/* Navigation Links */}
              <div className="hidden md:block ml-10">
                <div className="flex items-center space-x-2">
                  <Link to="/dashboard" className={navLinkClass('/dashboard')}>
                    <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Dashboard
                  </Link>
                  <Link to="/sessions" className={navLinkClass('/sessions')}>
                    <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Sessions
                  </Link>
                  <Link to="/patients" className={navLinkClass('/patients')}>
                    <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Patients
                  </Link>
                  <Link to="/qr-code" className={navLinkClass('/qr-code')}>
                    <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    QR Code
                  </Link>
                  <Link
                    to="/notifications"
                    className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive('/notifications')
                        ? 'bg-white/20 backdrop-blur-sm text-white shadow-lg'
                        : 'text-purple-100 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Bell size={18} />
                        {unreadCount > 0 && (
                          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center shadow-lg leading-none">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </div>
                      <span>Notifications</span>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-3">
              <Link
                to="/profile"
                className="flex items-center space-x-2 text-white/90 hover:text-white hover:bg-white/10 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Profile</span>
              </Link>
              <button
                onClick={logout}
                className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all shadow-lg hover:shadow-xl"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        <div className="w-[96%] lg:w-[94%] mx-auto py-6 px-[1%]">
          <Outlet />
        </div>
      </main>

      {/* Real-time notification toasts — rendered at bottom-right */}
      <NotificationToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default Layout;

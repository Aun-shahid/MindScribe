// src/components/Layout.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Bell, Menu, X, Settings, LogOut } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBrain } from '@fortawesome/free-solid-svg-icons';
import { useNotifications } from '../hooks/useNotifications';
import { resolveNotificationActionUrl } from '../utils/notificationNavigation';
import NotificationToast from './NotificationToast';

const formatDateHeader = (isoDate?: string) => {
  if (!isoDate) return 'Recent';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Recent';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).toUpperCase();
};

const formatTimestamp = (isoDate?: string) => {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const Layout = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const { unreadCount, notifications, markAsRead, markAllAsRead, toasts, dismissToast } = useNotifications();
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const notificationMenuRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const previewNotifications = useMemo(() => notifications.slice(0, 14), [notifications]);

  const profileInitials = useMemo(() => {
    const u = user;
    if (!u) return '?';
    const a = `${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`.trim();
    if (a) return a.toUpperCase();
    return u.username?.slice(0, 2).toUpperCase() || '?';
  }, [user]);

  const groupedNotifications = useMemo(() => {
    const groups: Array<{
      header: string;
      items: typeof previewNotifications;
    }> = [];

    for (const notification of previewNotifications) {
      const header = formatDateHeader(notification.sent_at);
      const lastGroup = groups[groups.length - 1];

      if (lastGroup && lastGroup.header === header) {
        lastGroup.items.push(notification);
      } else {
        groups.push({ header, items: [notification] });
      }
    }

    return groups;
  }, [previewNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(event.target as Node)) {
        setIsNotificationMenuOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsNotificationMenuOpen(false);
        setIsProfileMenuOpen(false);
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsNotificationMenuOpen(false);
    setIsProfileMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  const navLinkClass = (path: string) =>
    `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive(path)
        ? 'bg-white/15 backdrop-blur-sm text-white shadow-md ring-1 ring-white/15'
        : 'text-purple-100/95 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-purple-50">
      {/* Dark-glass header: rich deep purple base + blur = frosted glass with dark purple hue */}
      <nav className="sticky top-0 z-50 w-full bg-[#2f1060]/[.88] backdrop-blur-lg border-b border-purple-400/30 shadow-[0_6px_24px_-4px_rgba(74,29,150,0.45),inset_0_1px_0_rgba(216,180,254,0.22)]">
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                type="button"
                aria-label="Open navigation menu"
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden mr-2 p-2 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <Menu size={20} />
              </button>

              {/* Logo Section */}
              <Link to="/dashboard" className="flex-shrink-0 group">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faBrain} className="text-purple-300 text-[32px]" />
              <span className="text-2xl text-white font-bold tracking-tight">MindScribe</span>
            </div>
                </div>
              </Link>

              {/* Navigation Links */}
              <div className="hidden md:block ml-10">
                <div className="flex items-center space-x-4">
                  <Link to="/dashboard" className={navLinkClass('/dashboard')}>
                    <svg className="w-4 h-4 mr-1.5  inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <Link to="/tools" className={navLinkClass('/tools')}>
                    <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317a1.724 1.724 0 013.35 0 1.724 1.724 0 002.573 1.066 1.724 1.724 0 012.898 1.669 1.724 1.724 0 001.066 2.573 1.724 1.724 0 010 3.35 1.724 1.724 0 00-1.066 2.573 1.724 1.724 0 01-2.898 1.669 1.724 1.724 0 00-2.573 1.066 1.724 1.724 0 01-3.35 0 1.724 1.724 0 00-2.573-1.066 1.724 1.724 0 01-2.898-1.669 1.724 1.724 0 00-1.066-2.573 1.724 1.724 0 010-3.35 1.724 1.724 0 001.066-2.573 1.724 1.724 0 012.898-1.669 1.724 1.724 0 002.573-1.066z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Tools
                  </Link>
                  {/* <Link to="/qr-code" className={navLinkClass('/qr-code')}>
                    <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    QR Code
                  </Link> */}
                </div>
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-1 sm:space-x-3">
              <div className="relative" ref={notificationMenuRef}>
                <button
                  type="button"
                  aria-label="Open notifications"
                  onClick={() => setIsNotificationMenuOpen((prev) => !prev)}
                  className={`relative text-white/90 hover:text-white hover:bg-white/10 px-2 sm:px-3 py-2 rounded-lg transition-all ${
                    isNotificationMenuOpen ? 'bg-white/15 text-white' : ''
                  }`}
                >
                  <Bell size={19} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center shadow-lg leading-none">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {isNotificationMenuOpen && (
                  <div className="fixed left-3 right-3 top-16 w-auto md:absolute md:left-auto md:right-0 md:top-auto md:mt-2 md:w-[28rem] md:max-w-[95vw] bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/70">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                        <div className="flex items-center gap-3">
                          {unreadCount > 0 && (
                            <button
                              type="button"
                              onClick={() => markAllAsRead()}
                              className="text-xs text-purple-700 hover:text-purple-900 font-medium"
                            >
                              Mark all read
                            </button>
                          )}
                          <Link
                            to="/notifications"
                            onClick={() => setIsNotificationMenuOpen(false)}
                            className="text-xs text-purple-700 hover:text-purple-900 font-medium"
                          >
                            View all
                          </Link>
                        </div>
                      </div>
                    </div>

                    <div className="max-h-[calc(100vh-6.5rem)] md:max-h-[26rem] overflow-y-auto bg-gray-50/30">
                      {previewNotifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-gray-500">
                          No notifications yet.
                        </div>
                      ) : (
                        <div className="py-1">
                          {groupedNotifications.map((group) => (
                            <section key={group.header} className="mb-2">
                              <div className="px-4 py-2 bg-gray-100/90 border-y border-gray-200">
                                <p className="text-[11px] font-semibold tracking-wide text-gray-500">{group.header}</p>
                              </div>

                              <ul className="divide-y divide-gray-100">
                                {group.items.map((notification) => (
                                  <li key={notification.id}>
                                    <Link
                                      to={resolveNotificationActionUrl(notification)}
                                      onClick={() => {
                                        if (!notification.is_read) {
                                          markAsRead(notification.id);
                                        }
                                        setIsNotificationMenuOpen(false);
                                      }}
                                      className={`block px-4 py-3 transition-colors hover:bg-gray-50 ${
                                        notification.is_read
                                          ? 'bg-gray-50/95 text-gray-500'
                                          : 'bg-purple-50/35'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <p
                                          className={`text-[15px] font-semibold leading-5 ${
                                            notification.is_read ? 'text-gray-500 font-medium' : 'text-gray-900'
                                          }`}
                                        >
                                          {notification.title}
                                        </p>
                                        {!notification.is_read && (
                                          <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-purple-600" />
                                        )}
                                      </div>

                                      <p
                                        className={`mt-2 text-sm leading-5 whitespace-pre-wrap break-words ${
                                          notification.is_read ? 'text-gray-500' : 'text-gray-700'
                                        }`}
                                      >
                                        {notification.message}
                                      </p>

                                      <div
                                        className={`mt-2 flex items-center justify-between text-[11px] ${
                                          notification.is_read ? 'text-gray-400/90' : 'text-gray-400'
                                        }`}
                                      >
                                        <span>{notification.patient_name || 'MindScribe'}</span>
                                        <span>{formatTimestamp(notification.sent_at) || notification.time_ago}</span>
                                      </div>
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </section>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                  className={`flex items-center space-x-2 px-2 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isProfileMenuOpen
                      ? 'bg-white/15 text-white'
                      : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
                  aria-haspopup="menu"
                  aria-expanded={isProfileMenuOpen}
                  aria-label="Open profile menu"
                >
                  {user?.avatar_url && (
                    <img
                      src={user.avatar_url}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover border border-white/35 shrink-0 bg-white/10"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback') as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  )}
                  <span
                    className={`avatar-fallback ${user?.avatar_url ? 'hidden' : 'flex'} w-8 h-8 rounded-full bg-white/20 items-center justify-center text-[11px] font-bold border border-white/30 shrink-0`}
                    aria-hidden
                  >
                    {profileInitials}
                  </span>
                  <span className="hidden sm:inline">Profile</span>
                </button>

                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-2xl z-50">
                    <Link
                      to="/profile"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-purple-50 hover:text-purple-800"
                    >
                      <Settings className="h-4 w-4" strokeWidth={2.1} aria-hidden />
                      Settings
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" strokeWidth={2.1} aria-hidden />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile slide-out navigation */}
      <div
        className={`md:hidden fixed inset-0 z-40 transition-opacity duration-300 ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          type="button"
          aria-label="Close mobile navigation"
          onClick={() => setIsMobileMenuOpen(false)}
          className="absolute inset-0 bg-black/45"
        />

        <aside
          className={`absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-purple-900 border-r border-purple-500/30 shadow-2xl transform transition-transform duration-300 ease-out ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between px-4 h-16 border-b border-purple-500/20">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faBrain} className="text-purple-400 text-[24px]" />
              <span className="text-lg text-purple-200 font-bold">MindScribe</span>
            </div>
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-3 py-4 flex flex-col gap-2">
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

            <Link to="/tools" className={navLinkClass('/tools')}>
              <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317a1.724 1.724 0 013.35 0 1.724 1.724 0 002.573 1.066 1.724 1.724 0 012.898 1.669 1.724 1.724 0 001.066 2.573 1.724 1.724 0 010 3.35 1.724 1.724 0 00-1.066 2.573 1.724 1.724 0 01-2.898 1.669 1.724 1.724 0 00-2.573 1.066 1.724 1.724 0 01-3.35 0 1.724 1.724 0 00-2.573-1.066 1.724 1.724 0 01-2.898-1.669 1.724 1.724 0 00-1.066-2.573 1.724 1.724 0 010-3.35 1.724 1.724 0 001.066-2.573 1.724 1.724 0 012.898-1.669 1.724 1.724 0 002.573-1.066z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Tools
            </Link>

            <Link
              to="/profile"
              className={navLinkClass('/profile')}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="inline-flex items-center gap-2">
                {user?.avatar_url && (
                  <img
                    src={user.avatar_url}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover border border-white/30 bg-white/10 shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback') as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                )}
                <span className={`avatar-fallback ${user?.avatar_url ? 'hidden' : 'flex'} w-7 h-7 rounded-full bg-white/20 items-center justify-center text-[10px] font-bold border border-white/25 shrink-0`}>
                  {profileInitials}
                </span>
                Profile
              </span>
            </Link>
          </div>
        </aside>
      </div>

      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-purple-100/80 bg-white/70 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-gray-600 sm:flex-row sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} MindScribe. All rights reserved.</p>
          <div className="flex items-center gap-3">
            <Link to="/privacy-policy" className="hover:text-purple-700 transition-colors">
              Privacy Policy
            </Link>
            <span className="text-gray-300">•</span>
            <Link to="/terms-and-conditions" className="hover:text-purple-700 transition-colors">
              Terms & Conditions
            </Link>
            <span className="text-gray-300">•</span>
            <Link to="/help" className="hover:text-purple-700 transition-colors">
              Help
            </Link>
          </div>
        </div>
      </footer>

      {/* Real-time notification toasts — rendered at bottom-right */}
      <NotificationToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default Layout;

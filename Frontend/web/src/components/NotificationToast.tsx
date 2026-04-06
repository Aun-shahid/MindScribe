import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, AlertTriangle, TrendingDown } from 'lucide-react';
import type { NotificationToastEntry } from '../types/notification';
import { normalizeNotificationActionUrl } from '../utils/notificationNavigation';

interface Props {
  toasts: NotificationToastEntry[];
  onDismiss: (id: string) => void;
}

const AUTO_DISMISS_MS = 7000;

// Resolve colour scheme and icon from the source_event
const getToastStyle = (sourceEvent: string, priority: string) => {
  if (sourceEvent === 'mood.streak.bad3') {
    return {
      bg: 'bg-red-600',
      border: 'border-red-400',
      icon: <AlertTriangle size={20} className="text-white shrink-0" />,
      badge: 'URGENT',
      badgeBg: 'bg-red-800',
    };
  }
  if (sourceEvent === 'mood.trend.downward') {
    return {
      bg: 'bg-orange-500',
      border: 'border-orange-300',
      icon: <TrendingDown size={20} className="text-white shrink-0" />,
      badge: 'ALERT',
      badgeBg: 'bg-orange-700',
    };
  }
  // Generic high-priority
  if (priority === 'high') {
    return {
      bg: 'bg-purple-700',
      border: 'border-purple-400',
      icon: <AlertTriangle size={20} className="text-white shrink-0" />,
      badge: 'HIGH',
      badgeBg: 'bg-purple-900',
    };
  }
  return {
    bg: 'bg-gray-700',
    border: 'border-gray-500',
    icon: null,
    badge: 'INFO',
    badgeBg: 'bg-gray-900',
  };
};

const Toast = ({
  toast,
  onDismiss,
}: {
  toast: NotificationToastEntry;
  onDismiss: (id: string) => void;
}) => {
  const navigate = useNavigate();
  const style = getToastStyle(toast.source_event, toast.priority);

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const handleClick = () => {
    if (toast.action_url) {
      navigate(normalizeNotificationActionUrl(toast.action_url));
    }
    onDismiss(toast.id);
  };

  const readMuted = Boolean(toast.is_read);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className={`w-80 rounded-xl shadow-2xl border overflow-hidden cursor-pointer ${style.bg} ${style.border} ${
        readMuted ? 'opacity-80 saturate-50 grayscale-[0.25]' : ''
      }`}
      onClick={handleClick}
    >
      {/* Progress bar */}
      <motion.div
        className="h-1 bg-white/40 origin-left"
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: AUTO_DISMISS_MS / 1000, ease: 'linear' }}
      />

      <div className="p-4">
        <div className="flex items-start gap-3">
          {style.icon}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${style.badgeBg} text-white`}
              >
                {style.badge}
              </span>
              {toast.patient_name && (
                <span className="text-white/80 text-xs truncate">{toast.patient_name}</span>
              )}
            </div>
            <p className="text-white font-semibold text-sm leading-tight">{toast.title}</p>
            <p className="text-white/80 text-xs mt-1 leading-snug line-clamp-2">{toast.message}</p>
            {toast.action_url && (
              <p className="text-white/60 text-xs mt-2 underline">Tap to view patient</p>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(toast.id);
            }}
            className="shrink-0 text-white/60 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const NotificationToast = ({ toasts, onDismiss }: Props) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 items-end pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast toast={toast} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default NotificationToast;

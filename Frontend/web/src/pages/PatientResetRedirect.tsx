import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const PatientResetRedirect = () => {
  const [searchParams] = useSearchParams();
  const [showFallback, setShowFallback] = useState(false);

  const token = searchParams.get('token')?.trim() || '';

  const deepLink = useMemo(() => {
    if (!token) {
      return 'mindscribe://auth/reset-confirm';
    }
    return `mindscribe://auth/reset-confirm?token=${encodeURIComponent(token)}`;
  }, [token]);

  const webResetLink = useMemo(() => {
    if (!token) {
      return '/reset-confirm';
    }
    return `/reset-confirm?token=${encodeURIComponent(token)}`;
  }, [token]);

  useEffect(() => {
    if (!token) {
      setShowFallback(true);
      return;
    }

    window.location.href = deepLink;

    const fallbackTimer = window.setTimeout(() => {
      setShowFallback(true);
    }, 1300);

    return () => {
      window.clearTimeout(fallbackTimer);
    };
  }, [deepLink, token]);

  const openInApp = () => {
    window.location.href = deepLink;
  };

  return (
    <div className="min-h-screen bg-[#f6f3ff] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-8 border border-[#e8e2ff]">
        <h1 className="text-3xl font-bold text-[#4a2f8f] mb-3">Reset Your Password</h1>
        <p className="text-gray-700 mb-6">
          We are opening the MindScribe mobile app so you can reset your password securely.
        </p>

        {!showFallback && token ? (
          <p className="text-sm text-gray-600">Opening app...</p>
        ) : (
          <div className="space-y-4">
            {!token && (
              <p className="text-sm text-red-600">
                This reset link is missing a token. Please request a new password reset email.
              </p>
            )}

            <button
              type="button"
              onClick={openInApp}
              className="w-full bg-[#6d3df5] hover:bg-[#5d2fe0] text-white font-semibold rounded-lg px-4 py-3 transition-colors"
            >
              Open MindScribe App
            </button>

            <Link
              to={webResetLink}
              className="block w-full text-center bg-white border border-[#6d3df5] text-[#6d3df5] hover:bg-[#f3eeff] font-semibold rounded-lg px-4 py-3 transition-colors"
            >
              Continue In Web Reset Page
            </Link>

            <Link
              to="/request-reset"
              className="block text-center text-sm text-gray-600 hover:text-[#4a2f8f]"
            >
              Request a new reset email
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientResetRedirect;

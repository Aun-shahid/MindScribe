// src/pages/RequestReset.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RequestReset = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { requestPasswordReset, loading } = useAuth();
  const backgroundImage =
    'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1920&q=80';

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setEmailError(null);

    // Validate email
    if (!email.trim()) {
      setEmailError('Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    try {
      await requestPasswordReset(email.trim());
      setIsSubmitted(true);
    } catch (error: any) {
      setEmailError(error.message || 'Failed to send reset email. Please try again.');
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) {
      setEmailError(null);
    }
  };

  if (isSubmitted) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${backgroundImage})` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-[#16082f]/65 backdrop-blur-[2px]" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/70 via-[#5c4092]/55 to-[#2a0f4f]/75" aria-hidden />
        <div className="relative z-10 w-full max-w-md">
          <div className="rounded-3xl border border-white/25 bg-white/10 px-5 py-8 shadow-[0_20px_60px_-12px_rgba(16,8,35,0.75)] backdrop-blur-xl sm:px-8">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-200/60 bg-emerald-100/90">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="mb-2 text-lg font-semibold text-white">
                📧 Email Sent
              </h2>
              <p className="mb-6 text-sm text-purple-100">
                We've sent you a password reset link. Please check your email and follow the instructions to reset your password.
              </p>
              <Link
                to="/login"
                className="inline-flex w-full items-center justify-center rounded-xl border border-white/30 bg-[#5c4092]/90 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#43275a]/95"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${backgroundImage})` }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-[#16082f]/65 backdrop-blur-[2px]" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/70 via-[#5c4092]/55 to-[#2a0f4f]/75" aria-hidden />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center">
          <h2 className="mb-2 text-3xl font-bold text-white">
            Forgot Your Password?
          </h2>
          <p className="text-sm text-purple-100">
            Enter your email address and we will send you a link to reset your password.
          </p>
        </div>

      <div className="mt-8">
        <div className="rounded-3xl border border-white/25 bg-white/10 px-5 py-8 shadow-[0_20px_60px_-12px_rgba(16,8,35,0.75)] backdrop-blur-xl sm:px-8">
          <form className="space-y-6" onSubmit={handleResetRequest}>
            {emailError && (
              <div className="rounded-xl border border-red-300/45 bg-red-500/20 px-4 py-3 text-sm text-red-100">
                {emailError}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-purple-100">
                Email address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-purple-200/80"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                    />
                  </svg>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={`block w-full rounded-xl border bg-white/15 py-2.5 pl-10 pr-3 text-sm text-white placeholder-purple-100/70 transition focus:outline-none focus:ring-2 focus:ring-purple-300 ${
                    emailError ? 'border-red-300/80' : 'border-white/30 focus:border-purple-200'
                  }`}
                  placeholder="Enter your email"
                  value={email}
                  onChange={handleEmailChange}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`flex w-full justify-center rounded-xl border border-white/30 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all ${
                  loading
                    ? 'cursor-not-allowed bg-white/25'
                    : 'bg-[#5c4092]/90 hover:bg-[#43275a]/95 focus:outline-none focus:ring-2 focus:ring-purple-300'
                }`}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  'Send Reset Email'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="text-center">
              <Link
                to="/login"
                className="font-semibold text-white hover:text-purple-200"
                tabIndex={loading ? -1 : 0}
              >
                ← Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default RequestReset;
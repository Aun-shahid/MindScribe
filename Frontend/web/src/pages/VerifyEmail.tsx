// src/pages/VerifyEmail.tsx
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const VerifyEmail = () => {
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { verifyEmail, loading } = useAuth();
  const navigate = useNavigate();
  const otpInputRef = useRef<HTMLInputElement | null>(null);

  const backgroundImage =
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1920&q=80';

  const validateCode = (value: string): boolean => {
    return /^\d{6}$/.test(value);
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setCodeError(null);

    // Validate 6-digit code
    if (!code.trim()) {
      setCodeError('Please enter the 6-digit verification PIN');
      return;
    }

    if (!validateCode(code)) {
      setCodeError('PIN must be exactly 6 digits');
      return;
    }

    try {
      await verifyEmail(code);
      setIsSubmitted(true);
    } catch (error: any) {
      setCodeError(error.message || 'Email verification failed. Please check your 6-digit PIN and try again.');
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitizedValue = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(sanitizedValue);
    if (codeError) {
      setCodeError(null);
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="mb-2 text-lg font-semibold text-white">
                ✅ Email Verified
              </h2>
              <p className="mb-6 text-sm text-purple-100">
                Your email has been successfully verified. You can now log in to your account.
              </p>
              <Link
                to="/login"
                className="inline-flex w-full items-center justify-center rounded-xl border border-white/30 bg-[#5c4092]/90 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#43275a]/95"
              >
                Go to Login
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

      <div className="relative z-10 w-full max-w-xl">
        <div className="mb-6 text-center">
          <h2 className="mb-2 text-4xl font-bold text-white">6 digit code</h2>
          <p className="text-lg text-purple-100">Please enter 6 digit OTP verification code</p>
        </div>

        <div className="rounded-3xl border border-white/25 bg-white/10 px-5 py-8 shadow-[0_20px_60px_-12px_rgba(16,8,35,0.75)] backdrop-blur-xl sm:px-8">
          <form className="space-y-6" onSubmit={handleVerifyEmail}>
            {codeError && (
              <div className="rounded-xl border border-red-300/45 bg-red-500/20 px-4 py-3 text-sm text-red-100">
                {codeError}
              </div>
            )}

            <div>
              <label htmlFor="code" className="sr-only">
                6-Digit Verification PIN
              </label>
              <div
                className="relative"
                onClick={() => otpInputRef.current?.focus()}
                role="presentation"
              >
                <input
                  ref={otpInputRef}
                  id="code"
                  name="code"
                  type="text"
                  autoComplete="one-time-code"
                  required
                  className="pointer-events-none absolute h-0 w-0 opacity-0"
                  value={code}
                  onChange={handleCodeChange}
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  disabled={loading}
                />
                <div className="grid grid-cols-6 gap-2 sm:gap-3">
                  {Array.from({ length: 6 }, (_, idx) => {
                    const char = code[idx] || '';
                    const isActive = idx === code.length && code.length < 6;
                    return (
                      <div
                        key={`otp-${idx}`}
                        className={`flex h-16 items-center justify-center rounded-2xl border text-3xl font-semibold text-white shadow-inner transition-all ${
                          isActive
                            ? 'border-white/75 bg-white/20 ring-2 ring-white/35'
                            : 'border-white/25 bg-[#131d4a]/35'
                        }`}
                      >
                        {char || <span className="opacity-0">0</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="mt-3 text-xs text-purple-100/90">
                Check your email for the 6-digit verification PIN sent after registration.
              </p>
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
                    Verifying...
                  </>
                ) : (
                  'Verify Email'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="text-center text-sm">
              <span className="text-purple-100/90">Didn't receive the email? </span>
              <button
                type="button"
                className="font-semibold text-white hover:text-purple-200"
                onClick={() => navigate('/register')}
                disabled={loading}
              >
                Register again
              </button>
            </div>
            <div className="text-center mt-4">
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
  );
};

export default VerifyEmail;
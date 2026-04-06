// src/pages/Register.tsx
import { useMemo, useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/** YYYY-MM-DD for a date N full calendar years before today (local). */
function getIsoDateYearsAgo(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

function computeAgeFromIsoDate(dobIso: string): number {
  const dob = new Date(dobIso + 'T12:00:00');
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

function validatePasswordStrength(password: string): string | null {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Include at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Include at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Include at least one number';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Include at least one special character';
  return null;
}

const LICENSE_REGEX = /^[A-Za-z0-9\s-]{5,30}$/;
const SPECIALIZATION_REGEX = /^[A-Za-z0-9\s,.-]+$/;

/** Normalize Pakistani mobile input to +92 followed by 10 digits (mobile). */
function normalizePakistanMobileDigits(input: string): string {
  let d = input.replace(/\D/g, '');
  if (d.startsWith('92')) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  return d.slice(0, 10);
}

function validateSpecialization(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Specialization is required';
  if (trimmed.length < 3) return 'Enter at least 3 characters';
  if (trimmed.length > 250) return 'Maximum 250 characters allowed';
  if (!SPECIALIZATION_REGEX.test(trimmed)) {
    return 'Only letters, numbers, commas, spaces, dots and hyphens are allowed';
  }
  return null;
}

function FieldHintTooltip({ text }: { text: string }) {
  return (
    <span className="group relative ml-1 inline-flex align-middle">
      <button
        type="button"
        tabIndex={0}
        className="inline-flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full border border-gray-400 text-[10px] font-bold leading-none text-gray-600 outline-none transition hover:border-purple-600 hover:text-purple-700 focus-visible:ring-2 focus-visible:ring-purple-500"
        aria-label={text}
      >
        !
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-50 mt-1.5 w-max max-w-[min(260px,calc(100vw-2rem))] translate-x-1 rounded-md bg-gray-900 px-2.5 py-1.5 text-left text-xs font-normal leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

const Register = () => {
  const defaultDob = useMemo(() => getIsoDateYearsAgo(20), []);
  const maxDob = useMemo(() => getIsoDateYearsAgo(20), []);
  const minDob = useMemo(() => getIsoDateYearsAgo(100), []);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    license_number: '',
    specialization: '',
    date_of_birth: defaultDob,
  });
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const phoneLocalDigits = formData.phone_number.replace(/^\+92/, '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (error) setError('');
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ten = normalizePakistanMobileDigits(e.target.value);
    setFormData(prev => ({
      ...prev,
      phone_number: ten.length ? `+92${ten}` : '',
    }));
    if (validationErrors.phone_number) {
      setValidationErrors(prev => ({ ...prev, phone_number: '' }));
    }
    if (error) setError('');
  };

  const handleSpecializationBlur = () => {
    let v = formData.specialization
      .replace(/\s*,\s*/g, ', ')
      .replace(/,{2,}/g, ',')
      .trim();
    v = v
      .split(',')
      .map(seg =>
        seg
          .trim()
          .split(/\s+/)
          .map(w => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
          .join(' ')
      )
      .filter(Boolean)
      .join(', ');
    setFormData(prev => ({ ...prev, specialization: v }));
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!formData.username.trim()) errors.username = 'Username is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.first_name.trim()) errors.first_name = 'First name is required';
    if (!formData.last_name.trim()) errors.last_name = 'Last name is required';

    const pwdErr = validatePasswordStrength(formData.password);
    if (pwdErr) errors.password = pwdErr;

    if (!formData.password_confirm) {
      errors.password_confirm = 'Please confirm your password';
    } else if (formData.password !== formData.password_confirm) {
      errors.password_confirm = 'Passwords do not match';
    }

    const specErr = validateSpecialization(formData.specialization);
    if (specErr) errors.specialization = specErr;

    const licenseTrim = formData.license_number.trim();
    if (!licenseTrim) {
      errors.license_number = 'License number is required';
    } else if (!LICENSE_REGEX.test(licenseTrim)) {
      errors.license_number =
        'Use 5–30 characters: letters, numbers, spaces, or hyphens only';
    }

    if (!formData.date_of_birth) {
      errors.date_of_birth = 'Date of birth is required';
    } else {
      const age = computeAgeFromIsoDate(formData.date_of_birth);
      if (age < 20) {
        errors.date_of_birth = 'You must be at least 20 years old';
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (formData.phone_number) {
      const local = formData.phone_number.replace(/^\+92/, '');
      if (local.length !== 10) {
        errors.phone_number = 'Enter 10 digits after +92';
      } else if (!/^3\d{9}$/.test(local)) {
        errors.phone_number = 'Enter a valid Pakistan mobile number (10 digits starting with 3)';
      }
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const cleanedData = {
        ...formData,
        user_type: 'therapist' as const,
        license_number: formData.license_number.trim(),
        specialization: formData.specialization.trim(),
        phone_number: formData.phone_number.trim() || undefined,
        date_of_birth: formData.date_of_birth || undefined,
      };

      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key as keyof typeof cleanedData] === undefined) {
          delete cleanedData[key as keyof typeof cleanedData];
        }
      });

      const result = await register(cleanedData);
      if (!result.success) {
        setError('Registration failed. Please try again.');
      } else if (result.needsVerification) {
        navigate('/verify-email');
      }
    } catch (err: any) {
      if (err.details && typeof err.details === 'object') {
        setValidationErrors(err.details);
      } else {
        setError(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Link
        to="/"
        className="absolute top-6 left-6 z-20 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow"
      >
        <ArrowLeft size={22} className="text-gray-700" />
      </Link>

      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-900 via-purple-800 to-blue-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <img
          src="/images/loginn.png"
          alt="Minscribe"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />

        <div className="relative z-10 flex flex-col justify-end p-12 text-white">
          <div className="mb-8">
            <h1 className="text-5xl font-bold mb-4">MindScribe</h1>
            <div className="w-20 h-1 bg-white/50 rounded"></div>
          </div>

          <div className="backdrop-blur-sm bg-white/10 rounded-2xl p-8 border border-white/20">
            <p className="text-2xl font-light italic mb-6 leading-relaxed">
              "Join thousands of therapists managing their practice with ease."
            </p>
            <div>
              <p className="font-semibold text-lg">Start Your Journey</p>
              <p className="text-white/80">Professional Therapy Management</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 lg:w-1/2 overflow-y-auto">
        <div className="w-full max-w-2xl my-8">
          <div className="mb-8">
            <h2 className="text-4xl font-serif  text-[#66569c] mb-2">Create Your MindScribe Account</h2>
            <p className="text-[#6E5F9E] font-serif">Sign up as a therapist to get started</p>
          </div>

          {error && !Object.keys(validationErrors).length && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <input
                  name="username"
                  type="text"
                  placeholder="Enter username"
                  className={`w-full px-4 py-3 border-b-2 focus:outline-none transition-colors bg-transparent ${
                    validationErrors.username ? 'border-red-500' : 'border-gray-300 focus:border-purple-600'
                  }`}
                  value={formData.username}
                  onChange={handleChange}
                  disabled={loading}
                />
                {validationErrors.username && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.username}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  className={`w-full px-4 py-3 border-b-2 focus:outline-none transition-colors bg-transparent ${
                    validationErrors.email ? 'border-red-500' : 'border-gray-300 focus:border-purple-600'
                  }`}
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                />
                {validationErrors.email && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="mb-2 flex items-center text-sm font-medium text-gray-700">
                  Password
                  <FieldHintTooltip text="At least 8 characters with uppercase, lowercase, number, and special character." />
                </label>
                <input
                  name="password"
                  type="password"
                  placeholder="Enter password"
                  className={`w-full px-4 py-3 border-b-2 focus:outline-none transition-colors bg-transparent ${
                    validationErrors.password ? 'border-red-500' : 'border-gray-300 focus:border-purple-600'
                  }`}
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                />
                {validationErrors.password && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                <input
                  name="password_confirm"
                  type="password"
                  placeholder="Re-enter password"
                  className={`w-full px-4 py-3 border-b-2 focus:outline-none transition-colors bg-transparent ${
                    validationErrors.password_confirm ? 'border-red-500' : 'border-gray-300 focus:border-purple-600'
                  }`}
                  value={formData.password_confirm}
                  onChange={handleChange}
                  disabled={loading}
                />
                {validationErrors.password_confirm && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.password_confirm}</p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input
                  name="first_name"
                  type="text"
                  placeholder="Enter first name"
                  className={`w-full px-4 py-3 border-b-2 focus:outline-none transition-colors bg-transparent ${
                    validationErrors.first_name ? 'border-red-500' : 'border-gray-300 focus:border-purple-600'
                  }`}
                  value={formData.first_name}
                  onChange={handleChange}
                  disabled={loading}
                />
                {validationErrors.first_name && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.first_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input
                  name="last_name"
                  type="text"
                  placeholder="Enter last name"
                  className={`w-full px-4 py-3 border-b-2 focus:outline-none transition-colors bg-transparent ${
                    validationErrors.last_name ? 'border-red-500' : 'border-gray-300 focus:border-purple-600'
                  }`}
                  value={formData.last_name}
                  onChange={handleChange}
                  disabled={loading}
                />
                {validationErrors.last_name && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.last_name}</p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="mb-2 flex items-center text-sm font-medium text-gray-700">
                  License Number
                  <FieldHintTooltip text="AHPC, university registration, PACP, or similar (5–30 characters)." />
                </label>
                <input
                  name="license_number"
                  type="text"
                  placeholder="e.g. AHPC-123456 or university reg no."
                  maxLength={30}
                  pattern="[A-Za-z0-9\s-]{5,30}"
                  className={`w-full px-4 py-3 border-b-2 focus:outline-none transition-colors bg-transparent ${
                    validationErrors.license_number ? 'border-red-500' : 'border-gray-300 focus:border-purple-600'
                  }`}
                  value={formData.license_number}
                  onChange={handleChange}
                  disabled={loading}
                />
                {validationErrors.license_number && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.license_number}</p>
                )}
              </div>

              <div>
                <label className="mb-2 flex items-center text-sm font-medium text-gray-700">
                  Specialization
                  <FieldHintTooltip text="Enter areas of expertise separated by commas (e.g. Depression, Anxiety, Trauma)." />
                </label>
                <input
                  name="specialization"
                  type="text"
                  placeholder="e.g., Depression, Anxiety, PTSD, OCD"
                  maxLength={250}
                  required
                  className={`w-full px-4 py-3 border-b-2 focus:outline-none transition-colors bg-transparent ${
                    validationErrors.specialization ? 'border-red-500' : 'border-gray-300 focus:border-purple-600'
                  }`}
                  value={formData.specialization}
                  onChange={handleChange}
                  onBlur={handleSpecializationBlur}
                  disabled={loading}
                />
                {validationErrors.specialization && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.specialization}</p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="mb-2 flex flex-wrap items-center gap-x-1 text-sm font-medium text-gray-700">
                  <span>
                    Phone Number <span className="text-gray-500 text-xs font-normal">(Optional)</span>
                  </span>
                  <FieldHintTooltip text="10-digit Pakistan mobile number after +92 (starts with 3)." />
                </label>
                <div className="flex items-stretch">
                  <span className="flex items-center px-3 border-b-2 border-gray-300 bg-gray-100 text-gray-700 text-sm shrink-0">
                    +92
                  </span>
                  <input
                    name="phone_local"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="3XXXXXXXXX"
                    maxLength={10}
                    className={`flex-1 min-w-0 px-4 py-3 border-b-2 focus:outline-none transition-colors bg-transparent ${
                      validationErrors.phone_number ? 'border-red-500' : 'border-gray-300 focus:border-purple-600'
                    }`}
                    value={phoneLocalDigits}
                    onChange={handlePhoneChange}
                    disabled={loading}
                  />
                </div>
                {validationErrors.phone_number && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.phone_number}</p>
                )}
              </div>

              <div>
                <label className="mb-2 flex items-center text-sm font-medium text-gray-700">
                  Date of Birth
                  <FieldHintTooltip text="You must be at least 20 years old." />
                </label>
                <input
                  name="date_of_birth"
                  type="date"
                  min={minDob}
                  max={maxDob}
                  className={`w-full px-4 py-3 border-b-2 focus:outline-none transition-colors bg-transparent ${
                    validationErrors.date_of_birth ? 'border-red-500' : 'border-gray-300 focus:border-purple-600'
                  }`}
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  disabled={loading}
                />
                {validationErrors.date_of_birth && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.date_of_birth}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-semibold transition-all ${
                loading ? 'bg-purple-400 cursor-not-allowed' : 'bg-purple-900 hover:bg-purple-700 shadow-md hover:shadow-lg'
              } text-white mt-6`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-purple-600 hover:text-purple-700 font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;

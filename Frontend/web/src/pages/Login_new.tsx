import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Login_new = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required';
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return '';
  };

  const validatePassword = (password: string) => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors only on new submit
    setEmailError('');
    setPasswordError('');
    setError('');

    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);

    if (emailValidation) {
      setEmailError(emailValidation);
      return;
    }
    if (passwordValidation) {
      setPasswordError(passwordValidation);
      return;
    }

    setLoading(true);

    try {
      const success = await login(email.trim(), password);
      if (!success) {
        setError('Invalid email or password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      
      {/* Full-screen background image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/login.png"
          alt="Background"
          className="w-full h-full object-cover  "
        />        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/40" ></div>      </div>

      {/* Back Button */}
      <Link
        to="/"
        className="absolute top-6 left-6 z-20 p-2 bg-white/20 rounded-full backdrop-blur-sm hover:bg-white/30 transition"
      >
        <ArrowLeft size={22} className="text-gray-800" />
      </Link>

      {/* Centered login card with light purple transparency */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-purple-900/40 backdrop-blur-xl rounded-2xl shadow-2xl p-8">
        
        <h1 className="text-4xl font-bold text-white mb-2 text-center">
          LOGIN
        </h1>
        <p className="text-white/90 mb-6 text-center">
          Please log in to continue
        </p>

        {(error && !emailError && !passwordError) && (
          <div className="mb-4 p-3 bg-red-500/80 backdrop-blur-sm border-l-4 border-red-700 rounded">
            <p className="text-white text-sm text-center font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Email */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Email
            </label>
            <div
              className={`flex items-center bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 border ${
                emailError ? 'border-red-500 border-2' : 'border-white/40'
              }`}
            >
              <Mail size={20} className="text-white/80 mr-3" />
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 bg-transparent text-white placeholder-white/60 outline-none"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError('');
                }}
                disabled={loading}
              />
            </div>
            {emailError && (
              <p className="text-red-200 text-xs mt-1 ml-1 font-medium">{emailError}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Password
            </label>
            <div
              className={`flex items-center bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 border ${
                passwordError ? 'border-red-500 border-2' : 'border-white/40'
              }`}
            >
              <Lock size={20} className="text-white/80 mr-3" />
              <input
                type="password"
                placeholder="Enter your password"
                className="flex-1 bg-transparent text-white placeholder-white/60 outline-none"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                disabled={loading}
              />
            </div>
            {passwordError && (
              <p className="text-red-200 text-xs mt-1 ml-1 font-medium">{passwordError}</p>
            )}
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className={`
              w-full py-3 rounded-lg font-semibold text-base
              transition-all duration-200
              ${loading
                ? 'bg-purple-400/50 cursor-not-allowed text-white/60'
                : 'bg-white text-purple-700 hover:bg-purple-50 hover:shadow-lg'}
            `}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-purple-700 border-t-transparent rounded-full animate-spin mr-2"></div>
                Signing in...
              </div>
            ) : (
              'Login'
            )}
          </button>
        </form>

        {/* Links below */}
        <div className="mt-6 text-center space-y-2">
          <Link
            to="/register"
            className="block text-white text-sm hover:text-purple-100 transition-colors"
          >
            Don't have an account? <span className="font-semibold">Register</span>
          </Link>
          <Link
            to="/request-reset"
            className="block text-white text-sm hover:text-purple-100 transition-colors"
          >
            <span className="font-semibold">Forgot Password?</span>
          </Link>
          <Link
            to="/verify-email"
            className="block text-white text-sm hover:text-purple-100 transition-colors"
          >
            <span className="font-semibold">Verify Email</span>
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Login_new;

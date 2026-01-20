// src/pages/Login.tsx
import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
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
    if (!email) {
      return 'Email is required';
    }
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const validatePassword = (password: string) => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return '';
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (emailError) setEmailError('');
    if (error) setError('');
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (passwordError) setPasswordError('');
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
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

    setError('');
    setLoading(true);

    try {
      const success = await login(email.trim(), password);
      if (!success) {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Back Button */}
      <button 
        className="absolute top-12 left-6 z-10 p-2 bg-white rounded-full shadow-sm"
        onClick={() => window.history.back()}
        disabled={loading}
      >
        <ArrowLeft size={24} className="text-gray-700" />
      </button>

      {/* Decorative Circles */}  
      <div className="absolute -top-16 -right-16 z-0">
        <div className="w-32 h-32 bg-purple-200 opacity-80 rounded-full absolute top-12 right-0"></div>
        <div className="w-36 h-36 bg-purple-200 opacity-60 rounded-full absolute top-20 right-10"></div>
      </div>

      <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12">
        {/* Logo Image */}
        <div className="mb-8 -mt-12">
          <img
            src="/loginnew2.png"
            alt="MindScribe Login"
            className="w-96 h-96 object-contain"
          />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-purple-800 mb-2">LOGIN</h1>
        <p className="text-gray-600 mb-8">Please log in to continue</p>

        {/* Error Message */}
        {(error && !emailError && !passwordError) && (
          <div className="w-full max-w-sm mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
            <p className="text-red-700 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
          {/* Email Input */}
          <div>
            <div className={`flex items-center bg-gray-100 rounded-lg px-4 py-3 border ${emailError ? 'border-red-500 border-2' : 'border-gray-300'}`}>
              <Mail size={20} className="text-purple-700 mr-3" />
              <input
                type="email"
                placeholder="Email"
                className="flex-1 bg-transparent text-gray-800 placeholder-gray-500 outline-none"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                disabled={loading}
              />
            </div>
            {emailError && (
              <p className="text-red-500 text-xs mt-1 ml-1">{emailError}</p>
            )}
          </div>

          {/* Password Input */}
          <div>
            <div className={`flex items-center bg-gray-100 rounded-lg px-4 py-3 border ${passwordError ? 'border-red-500 border-2' : 'border-gray-300'}`}>
              <Lock size={20} className="text-purple-700 mr-3" />
              <input
                type="password"
                placeholder="Password"
                className="flex-1 bg-transparent text-gray-800 placeholder-gray-500 outline-none"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                disabled={loading}
              />
            </div>
            {passwordError && (
              <p className="text-red-500 text-xs mt-1 ml-1">{passwordError}</p>
            )}
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-purple-700 hover:bg-purple-800'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Signing in...
              </div>
            ) : (
              'Login'
            )}
          </button>
        </form>

        {/* Links */}
        <div className="mt-8 text-center space-y-3">
          <Link
            to="/register"
            className={`block text-purple-700 text-sm ${loading ? 'text-gray-400 pointer-events-none' : 'hover:text-purple-800'}`}
          >
            Don't have an account? Register
          </Link>
          <Link
            to="/request-reset"
            className={`block text-purple-700 text-sm ${loading ? 'text-gray-400 pointer-events-none' : 'hover:text-purple-800'}`}
          >
            Forgot Password?
          </Link>
          <Link
            to="/verify-email"
            className={`block text-purple-700 text-sm ${loading ? 'text-gray-400 pointer-events-none' : 'hover:text-purple-800'}`}
          >
            Verify Email
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
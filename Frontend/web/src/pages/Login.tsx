import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
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

    // Clear previous errors
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
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Back Button */}
      <Link
        to="/"
        className="absolute top-6 left-6 z-20 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow"
      >
        <ArrowLeft size={22} className="text-gray-700" />
      </Link>

      {/* Left Panel - Image & Testimonial */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <img
          src="/images/loginn.png"
          alt="TherapEase"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        
        <div className="relative z-10 flex flex-col justify-end p-12 text-white">
          <div className="mb-8">
            <h1 className="text-5xl font-bold mb-4">MindScribe</h1>
            <div className="w-20 h-1 bg-white/50 rounded"></div>
          </div>
          
          <div className="backdrop-blur-sm bg-white/10 rounded-2xl p-8 border border-white/20">
            <p className="text-2xl font-light italic mb-6 leading-relaxed">
              "Simply all the tools needed."
            </p>
            
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-4xl font-serif  text-[#66569c] mb-2">Welcome Back to MindScribe</h2>
            <p className="text-[#6E5F9E] font-serif">Please log in to continue</p>
          </div>

          {/* Error Message */}
          {(error && !emailError && !passwordError) && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="Enter you email.."
                  className={`w-full px-4 py-3 border-b-2 focus:outline-none transition-colors bg-transparent ${
                    emailError 
                      ? 'border-red-500' 
                      : 'border-gray-300 focus:border-purple-600'
                  }`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError('');
                  }}
                  disabled={loading}
                />
              </div>
              {emailError && (
                <p className="text-red-500 text-xs mt-1">{emailError}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Enter your password.."
                  className={`w-full px-4 py-3 border-b-2 focus:outline-none transition-colors bg-transparent ${
                    passwordError 
                      ? 'border-red-500' 
                      : 'border-gray-300 focus:border-purple-600'
                  }`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError('');
                  }}
                  disabled={loading}
                />
              </div>
              {passwordError && (
                <p className="text-red-500 text-xs mt-1">{passwordError}</p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <Link
                to="/request-reset"
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                Forgot password?
              </Link>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-semibold transition-all ${
                loading
                  ? 'bg-purple-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 shadow-md hover:shadow-lg'
              } text-white`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Log In'
              )}
            </button>

            
            
          </form>

          {/* Sign Up Link */}
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-purple-600 hover:text-purple-700 font-semibold">
                Sign up
              </Link>
            </p>
            <Link
              to="/verify-email"
              className="block mt-3 text-sm text-gray-500 hover:text-gray-700"
            >
              Verify Email
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
//         <p className="text-white/90 mb-6 text-center">
//           Please log in to continue
//         </p>

//         {(error && !emailError && !passwordError) && (
//           <div className="mb-4 p-3 bg-red-500/80 backdrop-blur-sm border-l-4 border-red-700 rounded">
//             <p className="text-white text-sm text-center font-medium">{error}</p>
//           </div>
//         )}

//         <form onSubmit={handleSubmit} className="space-y-5">

//           {/* Email */}
//           <div>
//             <label className="block text-white text-sm font-medium mb-2">
//               Email
//             </label>
//             <div
//               className={`flex items-center bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 border ${
//                 emailError ? 'border-red-500 border-2' : 'border-white/40'
//               }`}
//             >
//               <Mail size={20} className="text-white/80 mr-3" />
//               <input
//                 type="email"
//                 placeholder="Enter your email"
//                 className="flex-1 bg-transparent text-white placeholder-white/60 outline-none"
//                 value={email}
//                 onChange={(e) => {
//                   setEmail(e.target.value);
//                   setEmailError('');
//                 }}
//                 disabled={loading}
//               />
//             </div>
//             {emailError && (
//               <p className="text-red-200 text-xs mt-1 ml-1 font-medium">{emailError}</p>
//             )}
//           </div>

//           {/* Password */}
//           <div>
//             <label className="block text-white text-sm font-medium mb-2">
//               Password
//             </label>
//             <div
//               className={`flex items-center bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 border ${
//                 passwordError ? 'border-red-500 border-2' : 'border-white/40'
//               }`}
//             >
//               <Lock size={20} className="text-white/80 mr-3" />
//               <input
//                 type="password"
//                 placeholder="Enter your password"
//                 className="flex-1 bg-transparent text-white placeholder-white/60 outline-none"
//                 value={password}
//                 onChange={(e) => {
//                   setPassword(e.target.value);
//                   setPasswordError('');
//                 }}
//                 disabled={loading}
//               />
//             </div>
//             {passwordError && (
//               <p className="text-red-200 text-xs mt-1 ml-1 font-medium">{passwordError}</p>
//             )}
//           </div>

//           {/* Login Button */}
//           <button
//             type="submit"
//             disabled={loading}
//             className={`
//               w-full py-3 rounded-lg font-semibold text-base
//               transition-all duration-200
//               ${loading
//                 ? 'bg-purple-400/50 cursor-not-allowed text-white/60'
//                 : 'bg-white text-purple-700 hover:bg-purple-50 hover:shadow-lg'}
//             `}
//           >
//             {loading ? (
//               <div className="flex items-center justify-center">
//                 <div className="w-4 h-4 border-2 border-purple-700 border-t-transparent rounded-full animate-spin mr-2"></div>
//                 Signing in...
//               </div>
//             ) : (
//               'Login'
//             )}
//           </button>
//         </form>

//             <div className="mt-8 text-center space-y-3">
//               <Link
//                 to="/register"
//                 className="block text-white text-sm hover:text-purple-100"
//               >
//                 Don’t have an account? Register
//               </Link>
//               <Link
//                 to="/request-reset"
//                 className="block text-white text-sm hover:text-purple-100 transition-colors"
//               >
//                 <span className="font-semibold">Forgot Password?</span>
//               </Link>
//               <Link
//                 to="/verify-email"
//                 className="block text-white text-sm hover:text-purple-100 transition-colors"
//               >
//                 <span className="font-semibold">Verify Email</span>
//               </Link>
//             </div>

//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Login;

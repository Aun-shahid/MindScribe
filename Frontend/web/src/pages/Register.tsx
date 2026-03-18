// src/pages/Register.tsx
import { useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
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
    date_of_birth: '',
  });
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error for this field when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // Clear general error
    if (error) {
      setError('');
    }
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.username.trim()) errors.username = 'Username is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.first_name.trim()) errors.first_name = 'First name is required';
    if (!formData.last_name.trim()) errors.last_name = 'Last name is required';
    if (!formData.password) errors.password = 'Password is required';
    if (!formData.password_confirm) errors.password_confirm = 'Please confirm your password';
    if (!formData.license_number.trim()) errors.license_number = 'License number is required';
    if (!formData.specialization.trim()) errors.specialization = 'Specialization is required';
    
    if (formData.password && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (formData.password !== formData.password_confirm) {
      errors.password_confirm = 'Passwords do not match';
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Phone number validation (optional field, but must be valid if provided)
    if (formData.phone_number.trim()) {
      const phoneDigits = formData.phone_number.replace(/[-\s]/g, ''); // Remove dashes and spaces
      if (phoneDigits.length  <11 || phoneDigits.length > 15) {
        errors.phone_number = 'Please enter a valid phone number';
      } else if (!/^\d+$/.test(phoneDigits)) {
        errors.phone_number = 'Phone number must contain only digits';
      }
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Clean up the form data - remove empty optional fields
      const cleanedData = {
        ...formData,
        user_type: 'therapist' as const,
        phone_number: formData.phone_number.trim() || undefined,
        date_of_birth: formData.date_of_birth || undefined,
      };
      
      // Remove undefined values
      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key as keyof typeof cleanedData] === undefined) {
          delete cleanedData[key as keyof typeof cleanedData];
        }
      });

      const result = await register(cleanedData);
      if (!result.success) {
        setError('Registration failed. Please try again.');
      } else if (result.needsVerification) {
        // Redirect to verify email page
        navigate('/verify-email');
      }
      // If result.success is true and needsVerification is false, user is already logged in by AuthContext
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
      {/* Back Button */}
      <Link
        to="/"
        className="absolute top-6 left-6 z-20 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow"
      >
        <ArrowLeft size={22} className="text-gray-700" />
      </Link>

      {/* Left Panel - Image & Testimonial */}
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

      {/* Right Panel - Registration Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:w-1/2 overflow-y-auto">
        <div className="w-full max-w-2xl my-8">
          <div className="mb-8">
            <h2 className="text-4xl font-serif  text-[#66569c] mb-2">Create Your MindScribe Account</h2>
            <p className="text-[#6E5F9E] font-serif">Sign up as a therapist to get started</p>
          </div>

          {/* Error Message */}
          {(error && !Object.keys(validationErrors).length) && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Username & Email */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
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

            {/* Password & Confirm Password */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
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

            {/* First Name & Last Name */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
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

            {/* License Number & Specialization */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Number
                </label>
                <input
                  name="license_number"
                  type="text"
                  placeholder="Enter license number"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specialization
                </label>
                <input
                  name="specialization"
                  type="text"
                  placeholder="e.g., Depression, Anxiety"
                  className={`w-full px-4 py-3 border-b-2 focus:outline-none transition-colors bg-transparent ${
                    validationErrors.specialization ? 'border-red-500' : 'border-gray-300 focus:border-purple-600'
                  }`}
                  value={formData.specialization}
                  onChange={handleChange}
                  disabled={loading}
                />
                {validationErrors.specialization && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.specialization}</p>
                )}
              </div>
            </div>

            {/* Phone Number & Date of Birth */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-gray-500 text-xs">(Optional)</span>
                </label>
                <input
                  name="phone_number"
                  type="tel"
                  placeholder="03xx-xxxxxxx"
                  className={`w-full px-4 py-3 border-b-2 focus:outline-none transition-colors bg-transparent ${
                    validationErrors.phone_number ? 'border-red-500' : 'border-gray-300 focus:border-purple-600'
                  }`}
                  value={formData.phone_number}
                  onChange={handleChange}
                  disabled={loading}
                />
                {validationErrors.phone_number && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.phone_number}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth <span className="text-gray-500 text-xs">(Optional)</span>
                </label>
                <input
                  name="date_of_birth"
                  type="date"
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

            {/* Register Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-semibold transition-all ${
                loading
                  ? 'bg-purple-400 cursor-not-allowed'
                  : 'bg-purple-900 hover:bg-purple-700 shadow-md hover:shadow-lg'
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

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gray-50 text-gray-500">Or continue with</span>
              </div>
            </div>

            {/* Google Sign Up
            <button
              type="button"
              className="w-full py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 font-medium text-gray-700"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button> */}
          </form>

          {/* Login Link */}
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
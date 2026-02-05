// src/pages/Register.tsx
import { useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, User, Phone, Calendar, FileText, Award } from 'lucide-react';
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
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      
      {/* Full-screen background image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/login.png"
          alt="Background"
          className="w-full h-full object-cover"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Back Button */}
      <Link
        to="/"
        className="absolute top-6 left-6 z-20 p-2 bg-white/20 rounded-full backdrop-blur-sm hover:bg-white/30 transition"
      >
        <ArrowLeft size={22} className="text-gray-800" />
      </Link>

      {/* Centered register card with light purple transparency */}
      <div className="relative z-10 w-full max-w-2xl mx-4 my-8 bg-purple-900/40 backdrop-blur-xl rounded-2xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
        
        <h1 className="text-4xl font-bold text-white mb-2 text-center">
          REGISTER
        </h1>
        <p className="text-white/90 mb-6 text-center">
          Sign up as a therapist
        </p>

        {/* Error Message */}
        {(error && !Object.keys(validationErrors).length) && (
          <div className="mb-4 p-3 bg-red-500/80 backdrop-blur-sm border-l-4 border-red-700 rounded">
            <p className="text-white text-sm text-center font-medium">{error}</p>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Username */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Username
            </label>
            <div
              className={`flex items-center bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 border ${
                validationErrors.username ? 'border-red-500 border-2' : 'border-white/40'
              }`}
            >
              <User size={20} className="text-white/80 mr-3" />
              <input
                name="username"
                type="text"
                placeholder="Enter your username"
                className="flex-1 bg-transparent text-white placeholder-white/60 outline-none"
                value={formData.username}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            {validationErrors.username && (
              <p className="text-red-200 text-xs mt-1 ml-1 font-medium">{validationErrors.username}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Email
            </label>
            <div
              className={`flex items-center bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 border ${
                validationErrors.email ? 'border-red-500 border-2' : 'border-white/40'
              }`}
            >
              <Mail size={20} className="text-white/80 mr-3" />
              <input
                name="email"
                type="email"
                placeholder="Enter your email"
                className="flex-1 bg-transparent text-white placeholder-white/60 outline-none"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            {validationErrors.email && (
              <p className="text-red-200 text-xs mt-1 ml-1 font-medium">{validationErrors.email}</p>
            )}
          </div>

          {/* Password and Confirm Password in 2 columns */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Password */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Password
              </label>
              <div
                className={`flex items-center bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 border ${
                  validationErrors.password ? 'border-red-500 border-2' : 'border-white/40'
                }`}
              >
                <Lock size={20} className="text-white/80 mr-3" />
                <input
                  name="password"
                  type="password"
                  placeholder="Enter password"
                  className="flex-1 bg-transparent text-white placeholder-white/60 outline-none"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              {validationErrors.password && (
                <p className="text-red-200 text-xs mt-1 ml-1 font-medium">{validationErrors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Confirm Password
              </label>
              <div
                className={`flex items-center bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 border ${
                  validationErrors.password_confirm ? 'border-red-500 border-2' : 'border-white/40'
                }`}
              >
                <Lock size={20} className="text-white/80 mr-3" />
                <input
                  name="password_confirm"
                  type="password"
                  placeholder="Re-enter password"
                  className="flex-1 bg-transparent text-white placeholder-white/60 outline-none"
                  value={formData.password_confirm}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              {validationErrors.password_confirm && (
                <p className="text-red-200 text-xs mt-1 ml-1 font-medium">{validationErrors.password_confirm}</p>
              )}
            </div>
          </div>

          {/* First Name and Last Name in 2 columns */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* First Name */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                First Name
              </label>
              <div
                className={`flex items-center bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 border ${
                  validationErrors.first_name ? 'border-red-500 border-2' : 'border-white/40'
                }`}
              >
                <User size={20} className="text-white/80 mr-3" />
                <input
                  name="first_name"
                  type="text"
                  placeholder="Enter first name"
                  className="flex-1 bg-transparent text-white placeholder-white/60 outline-none"
                  value={formData.first_name}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              {validationErrors.first_name && (
                <p className="text-red-200 text-xs mt-1 ml-1 font-medium">{validationErrors.first_name}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Last Name
              </label>
              <div
                className={`flex items-center bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 border ${
                  validationErrors.last_name ? 'border-red-500 border-2' : 'border-white/40'
                }`}
              >
                <User size={20} className="text-white/80 mr-3" />
                <input
                  name="last_name"
                  type="text"
                  placeholder="Enter last name"
                  className="flex-1 bg-transparent text-white placeholder-white/60 outline-none"
                  value={formData.last_name}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              {validationErrors.last_name && (
                <p className="text-red-200 text-xs mt-1 ml-1 font-medium">{validationErrors.last_name}</p>
              )}
            </div>
          </div>

          {/* License Number */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              License Number
            </label>
            <div
              className={`flex items-center bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 border ${
                validationErrors.license_number ? 'border-red-500 border-2' : 'border-white/40'
              }`}
            >
              <FileText size={20} className="text-white/80 mr-3" />
              <input
                name="license_number"
                type="text"
                placeholder="Enter license number"
                className="flex-1 bg-transparent text-white placeholder-white/60 outline-none"
                value={formData.license_number}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            {validationErrors.license_number && (
              <p className="text-red-200 text-xs mt-1 ml-1 font-medium">{validationErrors.license_number}</p>
            )}
          </div>

          {/* Specialization */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Specialization
            </label>
            <div
              className={`flex items-center bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 border ${
                validationErrors.specialization ? 'border-red-500 border-2' : 'border-white/40'
              }`}
            >
              <Award size={20} className="text-white/80 mr-3" />
              <input
                name="specialization"
                type="text"
                placeholder="e.g., Depression, Anxiety"
                className="flex-1 bg-transparent text-white placeholder-white/60 outline-none"
                value={formData.specialization}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            {validationErrors.specialization && (
              <p className="text-red-200 text-xs mt-1 ml-1 font-medium">{validationErrors.specialization}</p>
            )}
          </div>

          {/* Phone Number and Date of Birth in 2 columns */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Phone Number */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Phone Number <span className="text-white/60 text-xs">(Optional)</span>
              </label>
              <div
                className={`flex items-center bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 border ${
                  validationErrors.phone_number ? 'border-red-500 border-2' : 'border-white/40'
                }`}
              >
                <Phone size={20} className="text-white/80 mr-3" />
                <input
                  name="phone_number"
                  type="tel"
                  placeholder="03xx-xxxxxxx"
                  className="flex-1 bg-transparent text-white placeholder-white/60 outline-none"
                  value={formData.phone_number}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              {validationErrors.phone_number && (
                <p className="text-red-200 text-xs mt-1 ml-1 font-medium">{validationErrors.phone_number}</p>
              )}
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Date of Birth <span className="text-white/60 text-xs">(Optional)</span>
              </label>
              <div
                className={`flex items-center bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 border ${
                  validationErrors.date_of_birth ? 'border-red-500 border-2' : 'border-white/40'
                }`}
              >
                <Calendar size={20} className="text-white/80 mr-3" />
                <input
                  name="date_of_birth"
                  type="date"
                  className="flex-1 bg-transparent text-white placeholder-white/60 outline-none [&::-webkit-calendar-picker-indicator]:invert"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              {validationErrors.date_of_birth && (
                <p className="text-red-200 text-xs mt-1 ml-1 font-medium">{validationErrors.date_of_birth}</p>
              )}
            </div>
          </div>

          {/* Register Button */}
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
                Creating account...
              </div>
            ) : (
              'Register'
            )}
          </button>
        </form>

        {/* Link to Login */}
        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="block text-white text-sm hover:text-purple-100 transition-colors"
          >
            Already have an account? <span className="font-semibold">Login</span>
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Register;
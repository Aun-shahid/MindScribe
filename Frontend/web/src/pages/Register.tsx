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
        <div className="mb-6 -mt-8">
          <img
            src="/register.png"
            alt="MindScribe Register"
            className="w-80 h-80 object-contain"
          />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-black text-purple-800 mb-6 text-center">
          SIGN UP AS THERAPIST
        </h1>

        {/* Error Message */}
        {(error && !Object.keys(validationErrors).length) && (
          <div className="w-full max-w-md mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
            <p className="text-red-700 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
          {/* Username */}
          <div>
            <label className="block text-purple-800 text-sm font-medium mb-1">Username</label>
            <input
              name="username"
              type="text"
              placeholder="Enter your username"
              className={`w-full px-3 py-3 bg-white rounded-lg border ${validationErrors.username ? 'border-red-500 border-2' : 'border-black'}`}
              value={formData.username}
              onChange={handleChange}
              disabled={loading}
            />
            {validationErrors.username && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.username}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-purple-800 text-sm font-medium mb-1">Email</label>
            <input
              name="email"
              type="email"
              placeholder="Enter your email"
              className={`w-full px-3 py-3 bg-white rounded-lg border ${validationErrors.email ? 'border-red-500 border-2' : 'border-black'}`}
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
            />
            {validationErrors.email && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-purple-800 text-sm font-medium mb-1">Password</label>
            <input
              name="password"
              type="password"
              placeholder="Enter password"
              className={`w-full px-3 py-3 bg-white rounded-lg border ${validationErrors.password ? 'border-red-500 border-2' : 'border-black'}`}
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
            />
            {validationErrors.password && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-purple-800 text-sm font-medium mb-1">Confirm Password</label>
            <input
              name="password_confirm"
              type="password"
              placeholder="Re-enter password"
              className={`w-full px-3 py-3 bg-white rounded-lg border ${validationErrors.password_confirm ? 'border-red-500 border-2' : 'border-black'}`}
              value={formData.password_confirm}
              onChange={handleChange}
              disabled={loading}
            />
            {validationErrors.password_confirm && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.password_confirm}</p>
            )}
          </div>

          {/* First Name */}
          <div>
            <label className="block text-purple-800 text-sm font-medium mb-1">First Name</label>
            <input
              name="first_name"
              type="text"
              placeholder="Enter first name"
              className={`w-full px-3 py-3 bg-white rounded-lg border ${validationErrors.first_name ? 'border-red-500 border-2' : 'border-black'}`}
              value={formData.first_name}
              onChange={handleChange}
              disabled={loading}
            />
            {validationErrors.first_name && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.first_name}</p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-purple-800 text-sm font-medium mb-1">Last Name</label>
            <input
              name="last_name"
              type="text"
              placeholder="Enter last name"
              className={`w-full px-3 py-3 bg-white rounded-lg border ${validationErrors.last_name ? 'border-red-500 border-2' : 'border-black'}`}
              value={formData.last_name}
              onChange={handleChange}
              disabled={loading}
            />
            {validationErrors.last_name && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.last_name}</p>
            )}
          </div>

          {/* License Number */}
          <div>
            <label className="block text-purple-800 text-sm font-medium mb-1">License Number</label>
            <input
              name="license_number"
              type="text"
              placeholder="Enter license number"
              className={`w-full px-3 py-3 bg-white rounded-lg border ${validationErrors.license_number ? 'border-red-500 border-2' : 'border-black'}`}
              value={formData.license_number}
              onChange={handleChange}
              disabled={loading}
            />
            {validationErrors.license_number && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.license_number}</p>
            )}
          </div>

          {/* Specialization */}
          <div>
            <label className="block text-purple-800 text-sm font-medium mb-1">Specialization</label>
            <input
              name="specialization"
              type="text"
              placeholder="e.g., Depression, Anxiety"
              className={`w-full px-3 py-3 bg-white rounded-lg border ${validationErrors.specialization ? 'border-red-500 border-2' : 'border-black'}`}
              value={formData.specialization}
              onChange={handleChange}
              disabled={loading}
            />
            {validationErrors.specialization && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.specialization}</p>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-purple-800 text-sm font-medium mb-1">Phone Number</label>
            <input
              name="phone_number"
              type="tel"
              placeholder="03xx-xxxxxxx"
              className={`w-full px-3 py-3 bg-white rounded-lg border ${validationErrors.phone_number ? 'border-red-500 border-2' : 'border-black'}`}
              value={formData.phone_number}
              onChange={handleChange}
              disabled={loading}
            />
            {validationErrors.phone_number && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.phone_number}</p>
            )}
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-purple-800 text-sm font-medium mb-1">Date of Birth</label>
            <input
              name="date_of_birth"
              type="date"
              className={`w-full px-3 py-3 bg-white rounded-lg border ${validationErrors.date_of_birth ? 'border-red-500 border-2' : 'border-black'}`}
              value={formData.date_of_birth}
              onChange={handleChange}
              disabled={loading}
            />
            {validationErrors.date_of_birth && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.date_of_birth}</p>
            )}
          </div>

          {/* Register Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-white mt-6 transition-colors ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-purple-700 hover:bg-purple-800'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
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
            className={`text-purple-700 text-sm underline ${loading ? 'text-gray-400 pointer-events-none' : 'hover:text-purple-800'}`}
          >
            Already have an account? Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
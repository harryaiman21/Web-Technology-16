/**
 * Login Form Component
 * Handles user authentication with email and password
 * Features: form validation, error handling, loading state, responsive design
 * All lines are fully commented for clarity
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { isValidEmail, handleError } from '../../utils/helpers';
import './LoginForm.css';

/**
 * Interface for form errors
 */
interface FormErrors {
  email?: string;
  password?: string;
  submit?: string;
}

/**
 * LoginForm Component
 * Renders a login form with validation and error handling
 */
export function LoginForm() {
  // Get auth context methods
  const { login, isLoading, error: authError } = useAuthContext();

  // Use navigate hook to redirect after login
  const navigate = useNavigate();

  // Form input state - email address
  const [email, setEmail] = useState<string>('');

  // Form input state - password
  const [password, setPassword] = useState<string>('');

  // Form validation errors
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Show/hide password toggle state
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Track submit attempts for UX
  const [submitAttempts, setSubmitAttempts] = useState<number>(0);

  /**
   * Validate email field
   * Returns error message if invalid, empty string if valid
   */
  const validateEmailField = (): string => {
    // Check if email is empty
    if (!email.trim()) {
      return 'Email is required';
    }

    // Check if email format is valid
    if (!isValidEmail(email)) {
      return 'Please enter a valid email address';
    }

    // Email is valid
    return '';
  };

  /**
   * Validate password field
   * Returns error message if invalid, empty string if valid
   */
  const validatePasswordField = (): string => {
    // Check if password is empty
    if (!password.trim()) {
      return 'Password is required';
    }

    // Check if password meets minimum length
    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }

    // Password is valid
    return '';
  };

  /**
   * Validate entire form
   * Returns true if all fields are valid, false otherwise
   */
  const validateForm = (): boolean => {
    // Validate individual fields
    const emailError = validateEmailField();
    const passwordError = validatePasswordField();

    // Prepare errors object
    const errors: FormErrors = {};

    // Add email error if exists
    if (emailError) {
      errors.email = emailError;
    }

    // Add password error if exists
    if (passwordError) {
      errors.password = passwordError;
    }

    // Update state with errors
    setFormErrors(errors);

    // Return true if no errors, false if errors exist
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle form submission
   * Validates form, calls login service, handles errors
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    // Prevent default form submission behavior
    e.preventDefault();

    // Increment submit attempt counter
    setSubmitAttempts(prev => prev + 1);

    // Clear previous submit errors
    setFormErrors(prev => ({ ...prev, submit: undefined }));

    // Validate form before submitting
    if (!validateForm()) {
      // Form is invalid, don't proceed
      return;
    }

    try {
      // Call login method from auth context
      await login(email, password);

      // Login successful, redirect to dashboard
      navigate('/dashboard');
    } catch (error: any) {
      // Handle login error
      const errorMessage = handleError(error);

      // Update form errors with submit error
      setFormErrors(prev => ({
        ...prev,
        submit: errorMessage,
      }));

      // Log error for debugging
      console.error('Login error:', error);
    }
  };

  /**
   * Handle email input change
   * Clear email error when user starts typing
   */
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Update email state with new value
    setEmail(e.target.value);

    // Clear email error since user is correcting it
    if (formErrors.email) {
      setFormErrors(prev => ({ ...prev, email: undefined }));
    }
  };

  /**
   * Handle password input change
   * Clear password error when user starts typing
   */
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Update password state with new value
    setPassword(e.target.value);

    // Clear password error since user is correcting it
    if (formErrors.password) {
      setFormErrors(prev => ({ ...prev, password: undefined }));
    }
  };

  /**
   * Toggle password visibility
   * Show/hide password text in input field
   */
  const togglePasswordVisibility = () => {
    // Toggle showPassword state
    setShowPassword(prev => !prev);
  };

  /**
   * Handle forgot password link click
   * Navigate to password reset page
   */
  const handleForgotPassword = () => {
    // Navigate to password reset page (will be implemented later)
    navigate('/auth/reset-password');
  };



  // JSX render
  return (
    <div className="login-form-container">
      {/* Login form wrapper */}
      <div className="login-form-wrapper">
        {/* Form header */}
        <div className="login-header">
          {/* DHL Logo/Branding */}
          <div style={{ marginBottom: '1.5rem' }}>
            <img 
              src="/dhl-logo.png" 
              alt="DHL Logo" 
              style={{ height: '40px', objectFit: 'contain' }}
            />
          </div>

          {/* Main title */}
          <h1 className="login-title">Sign In</h1>

          {/* Subtitle describing the page */}
          <p className="login-subtitle">
            Welcome to DHL Incident Reporting System
          </p>
        </div>

        {/* Login form element */}
        <form onSubmit={handleSubmit} className="login-form" noValidate>
          {/* Show auth error if exists */}
          {authError && (
            <div className="error-banner" role="alert">
              {/* Error icon */}
              <span className="error-icon">⚠️</span>

              {/* Error message */}
              <p>{authError}</p>
            </div>
          )}

          {/* Show submit error if exists */}
          {formErrors.submit && (
            <div className="error-banner" role="alert">
              {/* Error icon */}
              <span className="error-icon">⚠️</span>

              {/* Error message */}
              <p>{formErrors.submit}</p>
            </div>
          )}

          {/* Email input group */}
          <div className="form-group">
            {/* Email label */}
            <label htmlFor="email" className="form-label">
              Email Address
              {/* Required indicator */}
              <span className="required-indicator">*</span>
            </label>

            {/* Email input field */}
            <input
              id="email"
              type="email"
              className={`form-input ${formErrors.email ? 'input-error' : ''}`}
              placeholder="Enter your email"
              value={email}
              onChange={handleEmailChange}
              disabled={isLoading}
              autoComplete="email"
              aria-invalid={!!formErrors.email}
              aria-describedby={formErrors.email ? 'email-error' : undefined}
            />

            {/* Email error message */}
            {formErrors.email && (
              <span id="email-error" className="error-message">
                {formErrors.email}
              </span>
            )}
          </div>

          {/* Password input group */}
          <div className="form-group">
            {/* Password label */}
            <label htmlFor="password" className="form-label">
              Password
              {/* Required indicator */}
              <span className="required-indicator">*</span>
            </label>

            {/* Password input wrapper */}
            <div className="password-input-wrapper">
              {/* Password input field */}
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${formErrors.password ? 'input-error' : ''}`}
                placeholder="Enter your password"
                value={password}
                onChange={handlePasswordChange}
                disabled={isLoading}
                autoComplete="current-password"
                aria-invalid={!!formErrors.password}
                aria-describedby={formErrors.password ? 'password-error' : undefined}
              />

              {/* Password visibility toggle button */}
              <button
                type="button"
                className="password-toggle"
                onClick={togglePasswordVisibility}
                disabled={isLoading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {/* Corporate eye icon using SVG */}
                <svg 
                  width="18" 
                  height="18" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  style={{ pointerEvents: 'none' }}
                >
                  {!showPassword ? (
                    <>
                      {/* Open eye icon */}
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </>
                  ) : (
                    <>
                      {/* Closed eye icon */}
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </>
                  )}
                </svg>
              </button>
            </div>

            {/* Password error message */}
            {formErrors.password && (
              <span id="password-error" className="error-message">
                {formErrors.password}
              </span>
            )}
          </div>

          {/* Remember me checkbox */}
          <div className="form-group checkbox-group">
            {/* Checkbox input */}
            <input
              id="remember-me"
              type="checkbox"
              className="form-checkbox"
              disabled={isLoading}
            />

            {/* Checkbox label */}
            <label htmlFor="remember-me" className="checkbox-label">
              Remember me for 30 days
            </label>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="submit-button"
            disabled={isLoading || submitAttempts > 0 && Object.keys(formErrors).length > 0}
            aria-busy={isLoading}
          >
            {/* Show loading spinner or text based on isLoading state */}
            {isLoading ? (
              <>
                {/* Loading spinner */}
                <span className="spinner"></span>
                {/* Loading text */}
                <span>Signing in...</span>
              </>
            ) : (
              'Sign In'
            )}
          </button>

          {/* Forgot password link */}
          <div className="form-links">
            {/* Forgot password button */}
            <button
              type="button"
              className="link-button"
              onClick={handleForgotPassword}
              disabled={isLoading}
            >
              Forgot password?
            </button>
          </div>
        </form>

        {/* Footer with additional info */}
        <div className="form-footer">
          {/* Footer text for employee-only system */}
          <p className="footer-text">
            DHL Employee Portal • For access issues, contact your administrator
          </p>
        </div>
      </div>
    </div>
  );
}

// Export component as default
export default LoginForm;

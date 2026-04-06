/** Same rules as registration: length, upper, lower, digit, special. */
export function validatePasswordStrength(
  password: string,
  emptyMessage = 'Password is required'
): string | null {
  if (!password) return emptyMessage;
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Include at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Include at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Include at least one number';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Include at least one special character';
  return null;
}

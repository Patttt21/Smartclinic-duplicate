/**
 * Smart Clinic — Enterprise Password Validation Utility
 * Enforces High-Security standards compliant with RA 10173 and NPC security guidelines:
 * - Minimum 8 characters
 * - Must contain at least one uppercase letter (A-Z)
 * - Must contain at least one lowercase letter (a-z)
 * - Must contain at least one number (0-9)
 * - Must contain at least one special character (e.g. !@#$%^&*)
 */

export interface PasswordRuleCheck {
  id: string;
  label: string;
  passed: boolean;
}

export interface PasswordValidationResult {
  isValid: boolean;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  rules: PasswordRuleCheck[];
  errors: string[];
  errorMessage: string;
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const pwd = String(password || '');

  const hasMinLength = pwd.length >= 8;
  const hasUppercase = /[A-Z]/.test(pwd);
  const hasLowercase = /[a-z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pwd);

  const rules: PasswordRuleCheck[] = [
    { id: 'min_length', label: 'Minimum 8 characters', passed: hasMinLength },
    { id: 'uppercase', label: 'At least one uppercase letter (A–Z)', passed: hasUppercase },
    { id: 'lowercase', label: 'At least one lowercase letter (a–z)', passed: hasLowercase },
    { id: 'number', label: 'At least one number (0–9)', passed: hasNumber },
    { id: 'special_char', label: 'At least one special character (!@#$%^&*)', passed: hasSpecialChar },
  ];

  const errors: string[] = [];
  if (!hasMinLength) errors.push('Minimum 8 characters');
  if (!hasUppercase) errors.push('Must contain an uppercase letter');
  if (!hasLowercase) errors.push('Must contain a lowercase letter');
  if (!hasNumber) errors.push('Must contain at least one number');
  if (!hasSpecialChar) errors.push('Must contain at least one special character (e.g. !@#$%^&*)');

  const isValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
  const errorMessage = isValid
    ? ''
    : `Password must have at least 8 characters and include uppercase, lowercase, a number, and a special character (!@#$%^&*).`;

  return {
    isValid,
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    rules,
    errors,
    errorMessage,
  };
}

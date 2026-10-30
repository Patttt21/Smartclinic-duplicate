import React, { useState, useEffect } from 'react';
import {
  X,
  KeyRound,
  Lock,
  CheckCircle2,
  AlertCircle,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  Smartphone,
  ArrowLeft,
  QrCode,
  Copy,
  Check,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { API_BASE_URL } from '../../lib/config';
import { validatePasswordStrength } from '../../utils/passwordValidation';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import QRCode from 'qrcode';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultIdentifier?: string;
  onPasswordResetSuccess?: (newPass: string, resetEmail: string) => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  defaultIdentifier = '',
  onPasswordResetSuccess,
}) => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [identifier, setIdentifier] = useState(defaultIdentifier);
  const [recoveryMethod, setRecoveryMethod] = useState<'authenticator' | 'email'>('email');
  const [hasAuthenticatorAvailable, setHasAuthenticatorAvailable] = useState(false);
  const [isEmailRegistered, setIsEmailRegistered] = useState<boolean | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [loadingQr, setLoadingQr] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [code, setCode] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [lifecycleVersion, setLifecycleVersion] = useState(0);

  const resetVerificationState = (keepIdentifier = true) => {
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setError('');
    setLoading(false);
    setQrCodeDataUrl('');
    setTotpSecret('');
    setResetToken('');
    setLifecycleVersion((v) => v + 1);
    if (!keepIdentifier) {
      setIdentifier('');
      setIsEmailRegistered(null);
      setHasAuthenticatorAvailable(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setStep('request');
    resetVerificationState(true);
    if (defaultIdentifier) {
      setIdentifier(defaultIdentifier);
    }
  }, [isOpen, defaultIdentifier]);

  const handleGoBackToRequest = () => {
    setStep('request');
    resetVerificationState(true);
  };

  const handleIdentifierChange = (val: string) => {
    setIdentifier(val);
    resetVerificationState(true);
  };

  const handleModalClose = () => {
    setStep('request');
    resetVerificationState(true);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const cleanId = identifier.trim().toLowerCase();
    if (cleanId && cleanId.includes('@')) {
      const timer = setTimeout(() => {
        fetch(`${API_BASE_URL}/api/auth/password-reset/methods?email=${encodeURIComponent(cleanId)}`)
          .then(async (res) => {
            const data = await res.json();
            if (!res.ok || data?.isRegistered === false) {
              setIsEmailRegistered(false);
              setHasAuthenticatorAvailable(false);
              setError('This email address is not registered in our clinic system.');
            } else {
              setIsEmailRegistered(true);
              setError('');
              if (data?.hasAuthenticator) {
                setHasAuthenticatorAvailable(true);
              } else {
                setHasAuthenticatorAvailable(false);
                setRecoveryMethod('email');
              }
            }
          })
          .catch(() => {
            setIsEmailRegistered(null);
            setHasAuthenticatorAvailable(false);
          });
      }, 350);
      return () => clearTimeout(timer);
    } else {
      setIsEmailRegistered(null);
      setHasAuthenticatorAvailable(false);
      setError('');
    }
  }, [isOpen, identifier]);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => setCooldownSeconds((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // QR only when Authenticator recovery is selected on confirm step
  useEffect(() => {
    if (!isOpen || step !== 'confirm' || recoveryMethod !== 'authenticator') return;
    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId || !cleanId.includes('@')) return;

    let isMounted = true;
    setLoadingQr(true);

    const buildClientQr = async (otpAuthUrl: string, secret: string) => {
      try {
        const dataUrl = await QRCode.toDataURL(otpAuthUrl, {
          errorCorrectionLevel: 'M',
          margin: 2,
          scale: 6,
          color: { dark: '#0f172a', light: '#ffffff' },
        });
        if (isMounted) {
          setQrCodeDataUrl(dataUrl);
          setTotpSecret(secret);
        }
      } catch (e) {
        console.warn('[QR client gen]', e);
      }
    };

    fetch(`${API_BASE_URL}/api/auth/2fa/setup?email=${encodeURIComponent(cleanId)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!isMounted) return;
        const secret = data?.secret || '';
        const otpAuthUrl =
          data?.otpAuthUrl ||
          (secret
            ? `otpauth://totp/Smart%20Clinic:${encodeURIComponent(cleanId)}?secret=${secret}&issuer=Smart%20Clinic&algorithm=SHA1&digits=6&period=30`
            : '');
        if (data?.qrCodeDataUrl) {
          setQrCodeDataUrl(data.qrCodeDataUrl);
          setTotpSecret(secret);
        } else if (otpAuthUrl) {
          await buildClientQr(otpAuthUrl, secret);
        }
      })
      .catch(() => console.warn('[Authenticator QR] setup endpoint unreachable'))
      .finally(() => {
        if (isMounted) setLoadingQr(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, step, recoveryMethod, identifier]);

  if (!isOpen) return null;

  const handleCopySecret = async () => {
    if (!totpSecret) return;
    try {
      await navigator.clipboard.writeText(totpSecret);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleSelectAuthenticator = () => {
    const cleanId = identifier.trim();
    if (!cleanId || !cleanId.includes('@')) {
      setError('Please enter your registered email address first.');
      return;
    }
    if (isEmailRegistered === false) {
      setError('This email address is not registered in our clinic system.');
      return;
    }
    // Flush any previous verification codes or passwords
    resetVerificationState(true);
    setRecoveryMethod('authenticator');
    setStep('confirm');
  };

  const handleSendEmailCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId || !cleanId.includes('@')) {
      setError('Please enter your registered email address.');
      return;
    }
    if (isEmailRegistered === false) {
      setError('This email address is not registered in our clinic system.');
      return;
    }

    // Flush previous verification codes or passwords before sending new OTP
    resetVerificationState(true);

    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      const res = await fetch(`${API_BASE_URL}/api/auth/password-reset/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId, email: cleanId }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      setLoading(false);

      if (!res.ok || !data.success) {
        const msg =
          data.error ||
          (res.status === 404
            ? 'This email address is not registered in our clinic system.'
            : res.status === 429
            ? 'Too many requests. Wait a moment before requesting another code.'
            : 'Failed to dispatch password reset code. Please try again.');
        setError(msg);
        toastError(msg);
        return;
      }

      setCooldownSeconds(60);
      setResetToken(data.resetToken || '');
      setRecoveryMethod('email');
      setStep('confirm');
      toastSuccess(
        `Password reset security code sent to ${data.destination || cleanId}. Check your inbox (and spam folder).`
      );
    } catch (err: any) {
      setLoading(false);
      const isAbort = err?.name === 'AbortError';
      const msg = isAbort
        ? 'Request timed out while contacting the server. Try again.'
        : err?.message || 'Network error: Unable to reach the authentication server.';
      setError(msg);
      toastError(msg);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanCode = code.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setError(
        recoveryMethod === 'authenticator'
          ? 'Please enter the 6-digit rolling code from your Authenticator app.'
          : 'Please enter the 6-digit password reset code sent to your email.'
      );
      return;
    }
    const pwResult = validatePasswordStrength(newPassword);
    if (!pwResult.isValid) {
      setError(pwResult.errorMessage || 'Password does not meet high-security requirements.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      const cleanId = identifier.trim().toLowerCase();
      const res = await fetch(`${API_BASE_URL}/api/auth/password-reset/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: cleanId,
          code: cleanCode,
          newPassword,
          resetToken: resetToken || undefined,
          recoveryMethod,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      setLoading(false);

      if (!res.ok || !data.success) {
        const msg = data.error || 'Invalid or expired verification code. Request a new reset code.';
        setError(msg);
        toastError(msg);
        return;
      }

      toastSuccess('Password updated successfully! You can now log in with your new credentials.');
      if (onPasswordResetSuccess) onPasswordResetSuccess(newPassword, cleanId);
      handleModalClose();
    } catch (err: any) {
      setLoading(false);
      const isAbort = err?.name === 'AbortError';
      const msg = isAbort
        ? 'Request timed out. Please try again.'
        : err?.message || 'Verification failed: Cannot reach authentication server.';
      setError(msg);
      toastError(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleModalClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {step === 'request' ? 'Reset Account Password' : 'Create New Password'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {step === 'request' ? 'Select your secure account recovery pathway' : `Account: ${identifier}`}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="leading-tight">{error}</span>
          </div>
        )}

        {step === 'request' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Registered Account Email</label>
              <input
                key={`forgot-req-email-${lifecycleVersion}`}
                type="email"
                required
                value={identifier}
                onChange={(e) => handleIdentifierChange(e.target.value)}
                placeholder="name@example.com"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2.5 text-xs focus:ring-2 focus:ring-teal-500"
              />
              <p className="mt-1.5 text-[11px] text-slate-400">
                Choose recovery below. Authenticator App shows a QR code when selected.
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={handleSelectAuthenticator}
                className={`w-full p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-start gap-3 ${
                  hasAuthenticatorAvailable
                    ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 hover:bg-teal-50'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">Use Authenticator App (2FA)</span>
                    {hasAuthenticatorAvailable && (
                      <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/60 px-2 py-0.5 rounded-full">Active</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Scan QR / enter secret, then use the 6-digit code from Google Authenticator, Microsoft Authenticator, or Authy.
                  </p>
                </div>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleSendEmailCode}
                className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition cursor-pointer flex items-start gap-3 disabled:opacity-60"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                    {loading ? 'Sending reset code…' : 'Send Password Reset Code to Email'}
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Dispatches a one-time password reset code to your registered email inbox.
                  </p>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <form
            key={`forgot-confirm-${recoveryMethod}-${lifecycleVersion}`}
            onSubmit={handleConfirmReset}
            className="space-y-4"
          >
            <div className="p-3 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800 flex items-center justify-between text-xs text-teal-900 dark:text-teal-200">
              <div className="flex items-center gap-2 font-medium">
                {recoveryMethod === 'authenticator' ? (
                  <>
                    <Smartphone className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>Recovery: <strong>Authenticator App</strong></span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>Code sent to: <strong>{identifier}</strong></span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={handleGoBackToRequest}
                className="text-[11px] font-bold text-teal-700 dark:text-teal-300 hover:underline cursor-pointer"
              >
                Change
              </button>
            </div>

            {recoveryMethod === 'authenticator' && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                  <QrCode className="w-4 h-4 text-teal-600" />
                  <span>Scan with Authenticator App</span>
                </div>
                {loadingQr ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-2">
                    <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[11px] text-slate-400">Loading Authenticator QR Code...</span>
                  </div>
                ) : qrCodeDataUrl ? (
                  <div className="flex flex-col items-center justify-center gap-2 pt-1">
                    <div className="p-2.5 bg-white rounded-2xl border border-slate-200 shadow-xs inline-block">
                      <img src={qrCodeDataUrl} alt="Authenticator 2FA QR Code" className="w-36 h-36 object-contain mx-auto" />
                    </div>
                    {totpSecret && (
                      <div className="flex items-center gap-1.5 mt-1 max-w-full">
                        <span className="text-[10px] text-slate-400">Secret Key:</span>
                        <code className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 select-all truncate">
                          {totpSecret}
                        </code>
                        <button type="button" onClick={handleCopySecret} className="p-1 text-slate-400 hover:text-teal-600 transition cursor-pointer" title="Copy Secret Key">
                          {copiedKey ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 text-center py-4">QR unavailable. Use email recovery or try again.</p>
                )}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {recoveryMethod === 'authenticator' ? '6-Digit Authenticator App Code' : '6-Digit Email Reset Code'} *
                </label>
                {recoveryMethod === 'email' && (
                  <button type="button" disabled={loading || cooldownSeconds > 0} onClick={handleSendEmailCode} className="text-[11px] font-bold text-teal-600 disabled:opacity-50 cursor-pointer">
                    {cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : 'Resend code'}
                  </button>
                )}
              </div>
              <input
                key={`forgot-code-${recoveryMethod}-${lifecycleVersion}`}
                type="text"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder={recoveryMethod === 'authenticator' ? 'Enter from Authenticator' : '••••••'}
                autoComplete="one-time-code"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs font-mono font-bold tracking-widest text-center focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">New Password *</label>
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="flex items-center gap-1 text-[11px] font-medium text-teal-600 cursor-pointer">
                  {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showNewPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  key={`forgot-newpass-${lifecycleVersion}`}
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Create high-security password"
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 pl-9 pr-9 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>
              {newPassword && (
                <div className="mt-2.5">
                  <PasswordStrengthIndicator password={newPassword} />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Confirm New Password *</label>
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="flex items-center gap-1 text-[11px] font-medium text-teal-600 cursor-pointer">
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showConfirmPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  key={`forgot-confirmpass-${lifecycleVersion}`}
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 pl-9 pr-9 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleGoBackToRequest}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-2 py-2 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-teal-600/20 transition cursor-pointer disabled:opacity-60"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{loading ? 'Updating Credentials…' : 'Save New Password'}</span>
              </button>
            </div>
          </form>
        )}

        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
          <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
            <ShieldCheck className="w-3 h-3 text-teal-600" />
            <span>Republic Act No. 10173 • High-Security PBKDF2 Credential Reset</span>
          </span>
        </div>
      </div>
    </div>
  );
};

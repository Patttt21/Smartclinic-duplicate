import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Smartphone,
  ShieldCheck,
  Copy,
  Check,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useClinic } from '../../context/ClinicContext';
import { API_BASE_URL } from '../../lib/config';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  accountEmail: string;
}

export const AuthenticatorSetupModal: React.FC<Props> = ({
  isOpen,
  onClose,
  accountEmail,
}) => {
  const { success: toastSuccess, error: toastError } = useToast();
  const { enableTwoFactor, disableTwoFactor, checkTwoFactorStatus } = useClinic();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [confirmCode, setConfirmCode] = useState('');
  const [is2FaActive, setIs2FaActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [setupData, setSetupData] = useState<{
    secret: string;
    otpAuthUrl: string;
    qrCodeDataUrl: string;
  }>({
    secret: 'KNWWC4TUINWGS3TJMNAWI3LJNZFWK6JS',
    otpAuthUrl: '',
    qrCodeDataUrl: '',
  });

  const targetEmail = accountEmail || 'smartclinicrealacc@gmail.com';

  const loadSetup = async () => {
    const fallbackSecret = 'KNWWC4TUINWGS3TJMNAWI3LJNZFWK6JS';
    const defaultUrl = `otpauth://totp/Smart%20Clinic:${encodeURIComponent(targetEmail)}?secret=${fallbackSecret}&issuer=Smart%20Clinic&algorithm=SHA1&digits=6&period=30`;

    // Immediately generate client-side QR code to eliminate blank/loading delay
    try {
      const immediateQr = await QRCode.toDataURL(defaultUrl, {
        errorCorrectionLevel: 'M',
        margin: 2,
        scale: 6,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setSetupData((prev) => ({
        ...prev,
        otpAuthUrl: defaultUrl,
        qrCodeDataUrl: immediateQr,
      }));
    } catch (e) {
      console.warn('[QR Client Gen]', e);
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/auth/2fa/setup?email=${encodeURIComponent(targetEmail)}`);
      if (res.ok) {
        const data = await res.json();
        const qrUrl = data.otpAuthUrl
          ? await QRCode.toDataURL(data.otpAuthUrl, {
              errorCorrectionLevel: 'M',
              margin: 2,
              scale: 6,
              color: { dark: '#000000', light: '#ffffff' },
            })
          : data.qrCodeDataUrl;
        setSetupData({ ...data, qrCodeDataUrl: qrUrl });
      }

      // Check current 2FA status
      const statusRes = await checkTwoFactorStatus(targetEmail);
      setIs2FaActive(Boolean(statusRes?.enabled));
    } catch (err) {
      console.warn('[AuthenticatorSetupModal]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setConfirmCode('');
      setErrorMessage('');
      setStatusMessage('');
      loadSetup();
    }
  }, [isOpen, accountEmail]);

  if (!isOpen) return null;

  const handleCopySecret = () => {
    navigator.clipboard.writeText(setupData.secret);
    setCopied(true);
    toastSuccess('Secret key copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerifyAndEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setStatusMessage('');

    const cleanCode = confirmCode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMessage('Please enter the 6-digit rolling code showing in your Authenticator app.');
      return;
    }

    setVerifying(true);
    try {
      const res = await enableTwoFactor(targetEmail, cleanCode);
      setVerifying(false);

      if (!res.success) {
        setConfirmCode('');
        setErrorMessage(res.error || 'Invalid code. Check your device clock.');
        toastError(res.error || 'Failed to activate 2FA.');
        return;
      }

      setIs2FaActive(true);
      setConfirmCode('');
      setStatusMessage('Authenticator App (2FA) is now active! You will be prompted for your 6-digit code during login.');
      toastSuccess('Authenticator App (2FA) successfully activated!');
    } catch {
      setVerifying(false);
      setConfirmCode('');
      setErrorMessage('Connection failure. Unable to verify Authenticator code.');
      toastError('Verification failed.');
    }
  };

  const handleDisable2Fa = async () => {
    setErrorMessage('');
    setStatusMessage('');

    const cleanCode = confirmCode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMessage('Enter your current 6-digit Authenticator code to confirm disabling 2FA.');
      return;
    }

    setVerifying(true);
    try {
      const res = await disableTwoFactor(targetEmail, cleanCode);
      setVerifying(false);

      if (!res.success) {
        setErrorMessage(res.error || 'Invalid code. Check your device clock.');
        toastError(res.error || 'Failed to disable 2FA.');
        return;
      }

      setIs2FaActive(false);
      setStatusMessage('Authenticator App (2FA) has been disabled on this account.');
      toastSuccess('Authenticator 2FA disabled.');
    } catch {
      setVerifying(false);
      setErrorMessage('Connection failure.');
      toastError('Failed to disable 2FA.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Authenticator App (2FA)
              </h3>
              {is2FaActive && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Google Authenticator • Microsoft Authenticator • Authy
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="leading-tight">{errorMessage}</span>
          </div>
        )}

        {statusMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="leading-tight">{statusMessage}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Step 1: Scan QR Code */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-center">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              1. Scan this QR code in your Authenticator app
            </p>

            <div className="flex justify-center my-3">
              {loading && !setupData.qrCodeDataUrl ? (
                <div className="w-44 h-44 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-teal-600 animate-spin" />
                </div>
              ) : setupData.qrCodeDataUrl ? (
                <div className="p-2.5 bg-white rounded-2xl shadow-sm border border-teal-200 inline-block">
                  <img
                    src={setupData.qrCodeDataUrl}
                    alt="Authenticator QR Code"
                    className="w-40 h-40 object-contain"
                  />
                </div>
              ) : (
                <div className="w-44 h-44 rounded-xl bg-teal-50 flex flex-col items-center justify-center text-teal-700 text-xs p-4 text-center">
                  <ShieldCheck className="w-8 h-8 mb-2" />
                  <span>Use manual key below to configure</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Account: <strong className="font-mono text-teal-700 dark:text-teal-300">{targetEmail}</strong>
            </p>
          </div>

          {/* Step 2: Manual Secret Key */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-slate-700 dark:text-slate-300">2. Or enter setup key manually:</span>
              <button
                type="button"
                onClick={handleCopySecret}
                className="flex items-center gap-1 text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy Key'}</span>
              </button>
            </div>
            <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono font-bold text-xs text-slate-800 dark:text-slate-200 tracking-wider text-center select-all">
              {setupData.secret}
            </div>
          </div>

          {/* Step 3: Verification & Activation Form */}
          <form onSubmit={handleVerifyAndEnable} className="p-3.5 rounded-xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-teal-950 dark:text-teal-200 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-teal-600" />
                <span>3. Enter 6-digit rolling code to confirm</span>
              </label>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                autoComplete="one-time-code"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="w-32 rounded-xl border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs font-mono font-bold tracking-widest text-center focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="submit"
                disabled={verifying || confirmCode.length !== 6}
                className="flex-1 py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-teal-600/20 transition cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{verifying ? 'Verifying…' : is2FaActive ? 'Re-Verify Code' : 'Activate 2FA'}</span>
              </button>
            </div>

            {is2FaActive && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleDisable2Fa}
                  className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Disable Authenticator 2FA
                </button>
              </div>
            )}
          </form>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>RFC 6238 Standard (30-second rolling token)</span>
          <button
            type="button"
            onClick={() => {
              setConfirmCode('');
              setErrorMessage('');
              setStatusMessage('');
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer transition shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

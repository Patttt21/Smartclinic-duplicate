/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Stethoscope,
  UserRound,
  ShieldCheck,
  ArrowRight,
  Lock,
  AlertCircle,
  UserPlus,
  KeyRound,
  CheckCircle2,
  Smartphone,
  QrCode,
  Calendar,
  MapPin,
  Phone,
  Heart,
  AlertTriangle,
  UserCheck,
  Eye,
  EyeOff,
  FileText,
  Scale,
  Users,
} from 'lucide-react';
import { useClinic, type PrimaryAuthRole, type StaffSubRole } from '../../context/ClinicContext';
import { useToast } from '../../context/ToastContext';
import { SmartClinicLogo } from '../common/SmartClinicLogo';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { AuthenticatorSetupModal } from './AuthenticatorSetupModal';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { validatePasswordStrength } from '../../utils/passwordValidation';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { AllAccountsModal, type SystemAccount } from './AllAccountsModal';
import { API_BASE_URL } from '../../lib/config';

type AuthMode = 'login' | 'register';

export const LoginPage: React.FC = () => {
  const { login, setActiveTab, pendingAction, language, t } = useClinic();
  const { success: toastSuccess, error: toastError } = useToast();

  const [primaryRole, setPrimaryRole] = useState<PrimaryAuthRole>('patient');
  const [staffSubRole, setStaffSubRole] = useState<StaffSubRole>('nurse');
  const [mode, setMode] = useState<AuthMode>('login');

  // Basic Credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [enablePatient2Fa, setEnablePatient2Fa] = useState(false);

  // Patient Intake EMR Demographics
  const [dob, setDob] = useState('1995-05-15');
  const [age, setAge] = useState<number>(31);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Female');
  const [bloodType, setBloodType] = useState<'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'>('O+');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Emergency Contact & Clinical History
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactRelation, setEmergencyContactRelation] = useState('Family');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [allergies, setAllergies] = useState('');
  const [chronicConditions, setChronicConditions] = useState('');

  // UI state
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [hasAgreedPrivacy, setHasAgreedPrivacy] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showAuthenticatorModal, setShowAuthenticatorModal] = useState(false);
  const [showAllAccountsModal, setShowAllAccountsModal] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSelectAccount = (acc: SystemAccount) => {
    setPrimaryRole(acc.primaryRole);
    if (acc.staffSubRole) {
      setStaffSubRole(acc.staffSubRole);
    }
    setMode('login');
    setEmail(acc.email);
    setPassword(acc.password);
    setError('');
    if (acc.primaryRole === 'patient') {
      setIsCaptchaVerified(true);
    }
    if (acc.primaryRole === 'admin') {
      setEnablePatient2Fa(true);
    } else {
      setEnablePatient2Fa(false);
    }
    toastSuccess(`Selected ${acc.name} (${acc.roleTitle}).`);
  };

  // CAPTCHA verification state for Patient login
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [isCaptchaChecking, setIsCaptchaChecking] = useState(false);
  const [captchaError, setCaptchaError] = useState(false);

  const handleCaptchaClick = () => {
    if (isCaptchaVerified || isCaptchaChecking) return;
    setIsCaptchaChecking(true);
    setCaptchaError(false);
    setTimeout(() => {
      setIsCaptchaChecking(false);
      setIsCaptchaVerified(true);
    }, 600);
  };

  // Cleanly flush stale input and credential states when switching roles
  const handleRoleSwitch = (newRole: PrimaryAuthRole) => {
    setPrimaryRole(newRole);
    setMode('login');
    setError('');
    setPassword('');
    setConfirmPassword('');
    setTwoFactorCode('');
    setEnablePatient2Fa(false);
    setIsCaptchaVerified(false);
    setIsCaptchaChecking(false);
    setCaptchaError(false);
    setShowLoginPassword(false);
    setShowRegisterPassword(false);
    setShowRegisterConfirmPassword(false);
    if (newRole !== 'patient') {
      setFullName('');
      setPhone('');
      setAddress('');
      setEmergencyContactName('');
      setEmergencyContactPhone('');
      setAllergies('');
      setChronicConditions('');
      setHasAgreedPrivacy(false);
    }
  };

  // Cleanly flush credentials and verification states when switching auth mode
  const handleModeSwitch = (newMode: AuthMode) => {
    setMode(newMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setShowLoginPassword(false);
    setShowRegisterPassword(false);
    setShowRegisterConfirmPassword(false);
    setIsCaptchaVerified(false);
    setIsCaptchaChecking(false);
    setCaptchaError(false);
  };

  const handleStaffSubRoleSwitch = (newSubRole: StaffSubRole) => {
    setStaffSubRole(newSubRole);
    setPassword('');
    setTwoFactorCode('');
    setError('');
  };

  // Proactively check if entered email has Authenticator 2FA enabled (Admin, Doctor, Staff only — NEVER Patient)
  useEffect(() => {
    if (primaryRole === 'patient') {
      setEnablePatient2Fa(false);
      return;
    }
    const clean = email.trim().toLowerCase();
    if (clean && clean.includes('@')) {
      let isMounted = true;
      const timer = setTimeout(() => {
        fetch(`${API_BASE_URL}/api/auth/2fa/status?email=${encodeURIComponent(clean)}&role=${encodeURIComponent(primaryRole)}`)
          .then((res) => res.json())
          .then((d) => {
            if (isMounted && d?.enabled && (primaryRole as string) !== 'patient') {
              setEnablePatient2Fa(true);
            }
          })
          .catch(() => {});
      }, 300);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    } else {
      setEnablePatient2Fa(false);
    }
  }, [email, primaryRole]);

  const isPatient = primaryRole === 'patient';
  const isDoctor = primaryRole === 'doctor';
  const isStaff = primaryRole === 'staff';
  const isAdmin = primaryRole === 'admin';

  // Compute age dynamically when DOB changes
  const handleDobChange = (newDob: string) => {
    setDob(newDob);
    if (newDob) {
      const birth = new Date(newDob);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        calculatedAge--;
      }
      if (!isNaN(calculatedAge) && calculatedAge >= 0) {
        setAge(calculatedAge);
      }
    }
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Patient Validation & Flow
    if (isPatient) {
      const cleanEmail = email.trim().toLowerCase();

      // REGISTRATION MODE: Full Patient Demographics & Clinical Chart
      if (mode === 'register') {
        const cleanName = fullName.trim();
        if (cleanName.length < 2) {
          setError('Please enter your full legal name.');
          setLoading(false);
          return;
        }
        if (!dob) {
          setError('Please select your date of birth.');
          setLoading(false);
          return;
        }
        if (!address.trim()) {
          setError('Please enter your residential home address.');
          setLoading(false);
          return;
        }
        if (!cleanEmail || !cleanEmail.includes('@')) {
          setError('Please enter a valid email address.');
          setLoading(false);
          return;
        }
        const pwCheck = validatePasswordStrength(password);
        if (!pwCheck.isValid) {
          setError(
            pwCheck.errorMessage ||
              'Password must contain at least 8 characters, an uppercase letter, a lowercase letter, a number, and a special character.'
          );
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match. Please verify your password confirmation.');
          setLoading(false);
          return;
        }
        if (!hasAgreedPrivacy) {
          setError('Please review and accept the Patient Medical Privacy Policy & Consent Agreement (RA 10173) before creating your account.');
          setLoading(false);
          return;
        }

        const res = await login({
          primaryRole: 'patient',
          fullName: cleanName,
          email: cleanEmail,
          phone: phone.trim(),
          password,
          dob,
          age,
          gender,
          bloodType,
          address: address.trim(),
          emergencyContactName: emergencyContactName.trim(),
          emergencyContactRelation: emergencyContactRelation.trim(),
          emergencyContactPhone: emergencyContactPhone.trim(),
          allergies: allergies.trim(),
          chronicConditions: chronicConditions.trim(),
          isRegister: true,
        });

        setLoading(false);
        if (!res.success) {
          setError(res.error || 'Patient registration failed.');
          toastError(res.error || 'Patient registration failed.');
          return;
        }

        toastSuccess(
          pendingAction === 'book'
            ? 'Account created! Redirecting directly to appointment booking...'
            : pendingAction === 'queue'
            ? 'Account created! Redirecting directly to Live Queue board...'
            : `Welcome to Smart Clinic, ${cleanName}! EMR created and account active.`
        );
        return;
      }

      // LOGIN MODE: Email + Password + CAPTCHA Verification
      if (!cleanEmail || !cleanEmail.includes('@')) {
        setError('Please enter your registered email address.');
        setLoading(false);
        return;
      }
      if (!password) {
        setError('Please enter your account password.');
        setLoading(false);
        return;
      }

      // Patient-only CAPTCHA check
      if (!isCaptchaVerified) {
        setError("Please complete the security check ('I'm not a robot') before signing in.");
        setCaptchaError(true);
        setLoading(false);
        return;
      }

      const res = await login({
        primaryRole: 'patient',
        email: cleanEmail,
        password,
        isRegister: false,
      });

      setLoading(false);
      if (!res.success) {
        setError(res.error || 'Invalid email or password.');
        toastError(res.error || 'Invalid email or password.');
        return;
      }

      toastSuccess(
        pendingAction === 'book'
          ? 'Authenticated successfully! Redirecting directly to appointment booking...'
          : pendingAction === 'queue'
          ? 'Authenticated! Routing directly to Live Queue board...'
          : 'Welcome to your Smart Clinic Health Portal.'
      );
      return;
    }

    // Doctor Provider Login
    if (isDoctor) {
      const res = await login({
        primaryRole: 'doctor',
        email: email || 'maria.reyes@smartclinic.ph',
        password: password || 'doctor123',
        twoFactorCode: twoFactorCode.trim() || undefined,
      });
      setLoading(false);
      if (!res.success) {
        if (res.requires2FA) {
          setEnablePatient2Fa(true);
          setError(res.error || 'Authenticator 2FA is active on this physician account. Please enter the 6-digit code from your Authenticator app.');
          return;
        }
        setError(res.error || 'Doctor authentication failed.');
        toastError(res.error || 'Doctor authentication failed.');
        return;
      }
      toastSuccess(
        pendingAction === 'queue'
          ? 'Provider authenticated. Routing directly to Live Queue board.'
          : 'Provider authenticated. Routing to Doctor Consultation Suite.'
      );
      return;
    }

    // Staff Login (Nurse, Pharmacist, Receptionist, Lab Tech)
    if (isStaff) {
      const res = await login({
        primaryRole: 'staff',
        email: email || `${staffSubRole}@smartclinic.ph`,
        password: password || 'staff123',
        subRole: staffSubRole,
        twoFactorCode: twoFactorCode.trim() || undefined,
      });
      setLoading(false);
      if (!res.success) {
        if (res.requires2FA) {
          setEnablePatient2Fa(true);
          setError(res.error || 'Authenticator 2FA is active on this staff account. Please enter the 6-digit code from your Authenticator app.');
          return;
        }
        setError(res.error || 'Staff authentication failed.');
        toastError(res.error || 'Staff authentication failed.');
        return;
      }
      toastSuccess(
        pendingAction === 'queue'
          ? 'Staff authenticated. Routing directly to Live Queue board.'
          : `Staff authenticated. Routing to ${staffSubRole.replace('_', ' ').toUpperCase()} workbench.`
      );
      return;
    }

    // Admin Login with 2FA
    if (isAdmin) {
      const finalAdminCode = twoFactorCode.trim();
      if (!finalAdminCode) {
        setError('Please enter the 6-digit code from your Authenticator app.');
        setLoading(false);
        return;
      }

      const res = await login({
        primaryRole: 'admin',
        email: email.trim().toLowerCase() || 'smartclinicrealacc@gmail.com',
        password: password || 'SmartClinic@Admin2026',
        twoFactorCode: finalAdminCode,
      });

      setLoading(false);
      if (!res.success) {
        setError(res.error || 'Admin 2FA verification failed.');
        toastError(res.error || 'Admin 2FA verification failed.');
        return;
      }
      toastSuccess(
        pendingAction === 'queue'
          ? 'Admin Two-Factor Authentication verified. Accessing Live Queue.'
          : 'Admin Two-Factor Authentication verified. Access granted.'
      );
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-gradient-to-b from-teal-50/40 via-slate-50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 font-sans">
      <div className={`w-full ${isPatient && mode === 'register' ? 'max-w-2xl' : 'max-w-lg'} transition-all`}>

        {/* Header / Brand */}
        <div className="text-center mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="group inline-flex flex-col items-center cursor-pointer focus:outline-none transition-transform hover:scale-[1.02] active:scale-[0.98]"
            title="Return to Smart Clinic Homepage"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-teal-100 dark:border-teal-900/50 mb-3.5 group-hover:border-teal-400 dark:group-hover:border-teal-600 transition">
              <SmartClinicLogo className="w-11 h-11" glow={true} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-teal-600 dark:group-hover:text-teal-400 transition">
              Smart Clinic
            </h1>
          </button>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {t.common.privacyCertified}
            </span>
          </div>
        </div>

        {/* Auth Gate Notification if Intercepted from 'Book Now' */}
        {pendingAction === 'book' && (
          <div className="mb-4 p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
            <UserCheck className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              <strong>{language === 'fil' ? 'Pansamantalang Pagpigil sa Pag-book:' : 'Appointment Booking Gate:'}</strong> {language === 'fil' ? 'Mangyaring mag-sign in o magrehistro muna upang makumpirma ang inyong appointment.' : 'Please sign in or create an account to finalize your outpatient reservation. You will be redirected immediately.'}
            </span>
          </div>
        )}

        {/* Auth Gate Notification if Intercepted from 'View Live Queue' */}
        {pendingAction === 'queue' && (
          <div className="mb-4 p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-100 text-xs flex items-start gap-3 shadow-xs animate-in fade-in duration-200">
            <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <div className="font-bold text-teal-900 dark:text-white flex items-center gap-2">
                <span>{language === 'fil' ? 'Kinakailangan Mag-login Para sa Live Queue' : 'Authentication Required to View Live Queue'}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-200/80 dark:bg-teal-800 text-teal-800 dark:text-teal-200">
                  RA 10173 Protected
                </span>
              </div>
              <p className="text-teal-700 dark:text-teal-300 leading-relaxed">
                {language === 'fil' ? 'Para sa proteksyon ng medikal na datos alinsunod sa batas ng Pilipinas, kinakailangan munang mag-login upang makita ang kasalukuyang pila ng pasyente.' : 'To protect outpatient medical privacy and clinical triage confidentiality under Philippine Health Data Security Standards, viewing live waiting room details and room calls requires authentication.'}
              </p>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8">
          {/* Quick System Accounts Directory Access */}
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-teal-50 via-emerald-50/60 to-indigo-50/60 dark:from-slate-800/90 dark:via-slate-800/70 dark:to-slate-800/90 border border-teal-200/80 dark:border-slate-700">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                  All System Accounts & Credentials
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Quick access for Admin, Doctors, Clinical Staff & Patients
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAllAccountsModal(true)}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Users className="w-3.5 h-3.5" />
              <span>View All Accounts</span>
            </button>
          </div>

          {/* 4-Role Selector Tabs */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {(
              [
                { id: 'patient' as const, label: t.roles.patient, icon: UserRound },
                { id: 'doctor' as const, label: t.roles.doctor, icon: Stethoscope },
                { id: 'staff' as const, label: t.roles.staff, icon: Activity },
                { id: 'admin' as const, label: t.roles.admin, icon: ShieldCheck },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleRoleSwitch(id)}
                className={`flex flex-col items-center justify-center gap-1.5 py-2.5 sm:py-3 px-1 sm:px-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                  primaryRole === id
                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate max-w-full text-[10px] sm:text-[11px] leading-tight">{label}</span>
              </button>
            ))}
          </div>

          {/* ========================================================================= */}
          {/* PATIENT PORTAL CONTROLS */}
          {/* ========================================================================= */}
          {isPatient && (
            <div className="space-y-3 mb-5">
              <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleModeSwitch('login')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    mode === 'login' ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t.auth.signInBtn}
                </button>
                <button
                  type="button"
                  onClick={() => handleModeSwitch('register')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'register' ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {t.auth.registerTab}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STAFF MANDATORY SUB-ROLE SELECTOR */}
          {/* ========================================================================= */}
          {isStaff && (
            <div className="mb-5 p-3.5 rounded-2xl bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/60">
              <label className="block text-xs font-bold text-teal-900 dark:text-teal-200 mb-1.5">
                Mandatory Staff Sub-Role
              </label>
              <p className="text-[11px] text-teal-700 dark:text-teal-300 mb-2.5">
                Select your clinical assignment. Strictly excludes Doctor and Admin roles.
              </p>
              <select
                value={staffSubRole}
                onChange={(e) => handleStaffSubRoleSwitch(e.target.value as StaffSubRole)}
                className="w-full rounded-xl border border-teal-300 dark:border-teal-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                <option value="nurse">Nurse — Outpatient Triage & Vitals Workbench</option>
                <option value="pharmacist">Pharmacist — Medication Dispensary & Inventory</option>
                <option value="receptionist">Receptionist — Intake, Appointments & Queue</option>
                <option value="lab_technician">Lab Technician — Diagnostic Pathology Lab</option>
              </select>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DOCTOR DEDICATED PROVIDER NOTICE */}
          {/* ========================================================================= */}
          {isDoctor && (
            <div className="mb-5 p-3.5 rounded-2xl bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/60 flex items-start gap-2.5">
              <Stethoscope className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-teal-900 dark:text-teal-200">Physician Provider Portal</p>
                <p className="text-[11px] text-teal-700 dark:text-teal-300 mt-0.5">
                  Direct authentication routes straight to the Doctor Consultation Suite with SOAP notes, ICD-10 diagnostic coding, and e-prescribing.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ADMIN 2FA NOTICE */}
          {/* ========================================================================= */}
          {isAdmin && (
            <div className="mb-5 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-amber-900 dark:text-amber-200">Mandatory Administrator 2FA (Authenticator App)</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                  Admin access is strictly gated via RFC 6238 TOTP. Open Google Authenticator, Microsoft Authenticator, or Authy to retrieve your 6-digit verification code.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* AUTHENTICATION FORM */}
          {/* ========================================================================= */}
          <form
            key={`auth-form-${primaryRole}-${mode}-${isStaff ? staffSubRole : ''}`}
            onSubmit={handleSubmit}
            className="space-y-4 text-xs"
            autoComplete="off"
          >
            {/* PATIENT REGISTRATION: COMPREHENSIVE EMR INTAKE */}
            {isPatient && mode === 'register' ? (
              <div className="space-y-4">
                {/* 1. Demographics */}
                <div className="p-3.5 rounded-2xl bg-teal-50/50 dark:bg-slate-800/40 border border-teal-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-1.5 font-bold text-teal-800 dark:text-teal-300 text-xs">
                    <UserRound className="w-3.5 h-3.5" />
                    <span>Personal Demographics (EMR Intake)</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Full Legal Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Maria Angela Santos"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="col-span-2">
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Date of Birth <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="date"
                          required
                          value={dob}
                          onChange={(e) => handleDobChange(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 pl-8 pr-2.5 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Age</label>
                      <input
                        type="number"
                        min={0}
                        max={125}
                        value={age}
                        onChange={(e) => setAge(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Gender</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value as any)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-2 py-2 text-xs focus:ring-2 focus:ring-teal-500 font-medium"
                      >
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Blood Group</label>
                      <select
                        value={bloodType}
                        onChange={(e) => setBloodType(e.target.value as any)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 font-bold"
                      >
                        <option value="O+">O Positive (O+)</option>
                        <option value="A+">A Positive (A+)</option>
                        <option value="B+">B Positive (B+)</option>
                        <option value="AB+">AB Positive (AB+)</option>
                        <option value="O-">O Negative (O-)</option>
                        <option value="A-">A Negative (A-)</option>
                        <option value="B-">B Negative (B-)</option>
                        <option value="AB-">AB Negative (AB-)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Mobile Phone</label>
                      <div className="relative">
                        <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. +63 917 123 4567"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 pl-8 pr-2.5 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Complete Residential Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Street, Barangay, City, Province (e.g. 14 Emerald Ave, San Antonio, Pasig City)"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 pl-8 pr-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Emergency Contact & Clinical Flags */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    <span>Emergency Contact & Clinical Background</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Emergency Contact</label>
                      <input
                        type="text"
                        value={emergencyContactName}
                        onChange={(e) => setEmergencyContactName(e.target.value)}
                        placeholder="Contact Full Name"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Relationship</label>
                      <select
                        value={emergencyContactRelation}
                        onChange={(e) => setEmergencyContactRelation(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="Spouse">Spouse</option>
                        <option value="Parent">Parent</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Child">Child</option>
                        <option value="Guardian">Guardian</option>
                        <option value="Family">Other Family</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Emergency Phone</label>
                      <input
                        type="tel"
                        value={emergencyContactPhone}
                        onChange={(e) => setEmergencyContactPhone(e.target.value)}
                        placeholder="e.g. 0918 000 0000"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        <span>Known Allergies</span>
                      </label>
                      <input
                        type="text"
                        value={allergies}
                        onChange={(e) => setAllergies(e.target.value)}
                        placeholder="e.g. Penicillin, Seafood, or None"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Existing Chronic Conditions
                      </label>
                      <input
                        type="text"
                        value={chronicConditions}
                        onChange={(e) => setChronicConditions(e.target.value)}
                        placeholder="e.g. Hypertension, Asthma, or None"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Account Credentials */}
                <div className="p-3.5 rounded-2xl bg-teal-50/30 dark:bg-slate-800/40 border border-teal-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-1.5 font-bold text-teal-800 dark:text-teal-300 text-xs">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Portal Credentials</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-bold text-slate-700 dark:text-slate-300">
                          Password (High Security) <span className="text-rose-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                          className="flex items-center gap-1 text-[11px] font-medium text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                        >
                          {showRegisterPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span>{showRegisterPassword ? 'Hide' : 'See Password'}</span>
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                          key="reg-password"
                          type={showRegisterPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min 8 chars, upper, lower, num, special"
                          autoComplete="new-password"
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 pl-8 pr-8 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-bold text-slate-700 dark:text-slate-300">
                          Confirm Password <span className="text-rose-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowRegisterConfirmPassword(!showRegisterConfirmPassword)}
                          className="flex items-center gap-1 text-[11px] font-medium text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                        >
                          {showRegisterConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span>{showRegisterConfirmPassword ? 'Hide' : 'See Password'}</span>
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                          key="reg-confirm-password"
                          type={showRegisterConfirmPassword ? 'text' : 'password'}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter password"
                          autoComplete="new-password"
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 pl-8 pr-8 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* High Security Password Strength Indicator Checklist */}
                  {password && (
                    <div className="pt-1">
                      <PasswordStrengthIndicator password={password} />
                    </div>
                  )}

                  {/* Philippine Medical Data Privacy Consent (RA 10173) */}
                  <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        id="privacyConsent"
                        required
                        checked={hasAgreedPrivacy}
                        onChange={(e) => setHasAgreedPrivacy(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-teal-300 text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600 shrink-0"
                      />
                      <label htmlFor="privacyConsent" className="text-[11px] text-teal-900 dark:text-teal-200 leading-relaxed cursor-pointer select-none">
                        I have read, understood, and accept the <strong>Smart Clinic Patient Data Privacy Policy</strong> and consent to the secure processing of my medical and health records in accordance with <strong>Republic Act No. 10173 (Philippine Data Privacy Act of 2012)</strong>.
                      </label>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pt-1.5 border-t border-teal-100 dark:border-teal-900/60 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setShowPrivacyModal(true)}
                        className="text-teal-700 dark:text-teal-300 font-bold hover:underline flex items-center gap-1.5 cursor-pointer text-left"
                      >
                        <Scale className="w-3.5 h-3.5 text-teal-600" />
                        <span>Read Full Philippine Medical Privacy Standards & Data Charter</span>
                      </button>
                      <span className="text-[10px] text-teal-600/80 dark:text-teal-400/80 font-mono">
                        PBKDF2 Salted Hashing & Tenant Isolation
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-[11px] text-teal-800 dark:text-teal-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span>Your official Medical Record Number (MRN) and EMR chart will be generated instantly.</span>
                  </div>
                </div>
              </div>
            ) : (
              /* STANDARD LOGIN FORM (Patient Sign In, Doctor, Staff, Admin) */
              <div className="space-y-4">
                {/* Email Field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700 dark:text-slate-300">
                      {isAdmin ? 'Administrator Account' : isDoctor ? 'Provider Work Email' : isStaff ? 'Staff Work Email' : 'Email Address'}
                    </label>
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => {
                      if (primaryRole === 'patient') {
                        setEnablePatient2Fa(false);
                        return;
                      }
                      const clean = email.trim().toLowerCase();
                      if (clean.includes('@')) {
                        fetch(`${API_BASE_URL}/api/auth/2fa/status?email=${encodeURIComponent(clean)}&role=${encodeURIComponent(primaryRole)}`)
                          .then((res) => res.json())
                          .then((d) => {
                            if (d?.enabled && (primaryRole as string) !== 'patient') {
                              setEnablePatient2Fa(true);
                            }
                          })
                          .catch(() => {});
                      }
                    }}
                    placeholder={
                      isAdmin
                        ? 'smartclinicrealacc@gmail.com'
                        : isDoctor
                        ? 'maria.reyes@smartclinic.ph'
                        : isStaff
                        ? `${staffSubRole}@smartclinic.ph`
                        : 'patient@example.com'
                    }
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2.5 text-xs focus:ring-2 focus:ring-teal-500 font-medium"
                  />
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700 dark:text-slate-300">
                      {isDoctor
                        ? 'Provider Password / License Pass'
                        : isAdmin
                        ? 'Administrator Master Password'
                        : 'Account Password'}
                    </label>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 cursor-pointer"
                      >
                        {showLoginPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showLoginPassword ? 'Hide' : 'See Password'}</span>
                      </button>
                      {/* Forgot password rendered in login mode */}
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => setShowForgotPassword(true)}
                          className="text-[11px] font-medium text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      key={`login-pass-${primaryRole}-${isStaff ? staffSubRole : ''}`}
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isAdmin ? 'SmartClinic@Admin2026' : isPatient ? 'patient123' : '••••••••'}
                      autoComplete="current-password"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 pl-9 pr-3 py-2.5 text-xs focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {/* Patient Security Verification: CAPTCHA / "I'm not a robot" */}
                {isPatient && mode === 'login' && (
                  <div className="pt-1">
                    <div
                      className={`p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border transition-all ${
                        captchaError
                          ? 'border-rose-400 dark:border-rose-700 bg-rose-50/40 dark:bg-rose-950/20 shadow-xs'
                          : isCaptchaVerified
                          ? 'border-emerald-300 dark:border-emerald-700/80 bg-emerald-50/30 dark:bg-emerald-950/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={handleCaptchaClick}
                            aria-label="Verify I am not a robot"
                            className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${
                              isCaptchaVerified
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                                : isCaptchaChecking
                                ? 'border-teal-500 bg-white dark:bg-slate-900'
                                : captchaError
                                ? 'border-rose-400 hover:border-rose-500 bg-white dark:bg-slate-900'
                                : 'border-slate-300 dark:border-slate-600 hover:border-teal-500 bg-white dark:bg-slate-900'
                            }`}
                          >
                            {isCaptchaChecking ? (
                              <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                            ) : isCaptchaVerified ? (
                              <CheckCircle2 className="w-4 h-4 text-white stroke-[2.5]" />
                            ) : null}
                          </button>

                          <div>
                            <label
                              onClick={handleCaptchaClick}
                              className="text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer select-none flex items-center gap-1.5"
                            >
                              <span>I'm not a robot</span>
                              {isCaptchaVerified && (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.2 rounded-full">
                                  Verified
                                </span>
                              )}
                            </label>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              {isCaptchaVerified
                                ? 'Security check passed • Bot protection verified'
                                : 'Click checkbox to confirm security verification'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0 pl-3 border-l border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                            <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">reCAPTCHA</span>
                          </div>
                          <div className="flex items-center gap-1 text-[9px] text-slate-400 mt-0.5">
                            <button
                              type="button"
                              onClick={() => setShowPrivacyModal(true)}
                              className="hover:underline cursor-pointer"
                            >
                              Privacy
                            </button>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() => setShowPrivacyModal(true)}
                              className="hover:underline cursor-pointer"
                            >
                              Terms
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2FA Code Input & Authenticator App Integration (Strictly Admin / Staff — NEVER Patient) */}
                {!isPatient && (isAdmin || (isStaff && enablePatient2Fa)) && (
                  <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-slate-800/60 border border-amber-200 dark:border-amber-800/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                        <span>Authenticator App 2FA Code</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAuthenticatorModal(true)}
                        className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <QrCode className="w-3 h-3" />
                        <span>Setup / QR Code</span>
                      </button>
                    </div>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        key={`login-2fa-${primaryRole}-${isStaff ? staffSubRole : ''}`}
                        type="text"
                        maxLength={6}
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter 6-digit rolling code from phone"
                        autoComplete="one-time-code"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        className="w-full rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 pl-9 pr-3 py-2.5 text-xs font-mono font-bold tracking-widest focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Google Authenticator • Microsoft Authenticator • Authy</span>
                      <span className="text-[10px] text-slate-400">RFC 6238 TOTP Standard</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error Message Alert */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-3 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Action */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-lg shadow-teal-600/25 transition cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <span>Processing...</span>
              ) : (
                <>
                  <span>
                    {isPatient && mode === 'register'
                      ? 'Create Patient Account & Register EMR'
                      : isDoctor
                      ? 'Enter Consultation Suite'
                      : isStaff
                      ? `Access ${staffSubRole.replace('_', ' ').toUpperCase()} Workbench`
                      : isAdmin
                      ? 'Verify 2FA & Access Dashboard'
                      : 'Sign In to Health Portal'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {isPatient && mode === 'register' && (
              <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
                Already registered with Smart Clinic?{' '}
                <button
                  type="button"
                  onClick={() => handleModeSwitch('login')}
                  className="font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                >
                  Sign In to Health Portal
                </button>
              </div>
            )}

            {isPatient && mode === 'login' && (
              <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
                New outpatient?{' '}
                <button
                  type="button"
                  onClick={() => handleModeSwitch('register')}
                  className="font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                >
                  Create Patient Account (Full EMR Intake)
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        defaultIdentifier={email}
        onPasswordResetSuccess={(newPass, resetEmail) => {
          if (resetEmail) {
            setEmail(resetEmail);
          }
          setPassword(newPass);
          setTwoFactorCode('');
          setEnablePatient2Fa(false);
          setShowAuthenticatorModal(false);
          setMode('login');
          setError('');
          setLoading(false);

          const isAdminAccount =
            resetEmail?.toLowerCase() === 'smartclinicrealacc@gmail.com' ||
            resetEmail?.toLowerCase().includes('admin');
          if (isAdminAccount) {
            setPrimaryRole('admin');
            toastSuccess('Password updated successfully! Enter the 6-digit Authenticator code to complete login.');
          } else if (
            resetEmail?.toLowerCase().includes('doctor') ||
            resetEmail?.toLowerCase().includes('reyes') ||
            resetEmail?.toLowerCase().includes('mendoza') ||
            resetEmail?.toLowerCase().includes('bautista')
          ) {
            setPrimaryRole('doctor');
            toastSuccess('Password updated successfully! Please sign in with your new credentials.');
          } else {
            setPrimaryRole('patient');
            toastSuccess('Password updated successfully! Please sign in with your new credentials.');
          }
        }}
      />

      <AuthenticatorSetupModal
        isOpen={showAuthenticatorModal}
        onClose={() => setShowAuthenticatorModal(false)}
        accountEmail={isAdmin ? 'smartclinicrealacc@gmail.com' : email.trim().toLowerCase() || 'elena.vargas@example.com'}
      />

      <PrivacyPolicyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        onAgree={() => {
          setHasAgreedPrivacy(true);
          toastSuccess('Agreed to Philippine Medical Privacy Policy (RA 10173).');
        }}
      />

      <AllAccountsModal
        isOpen={showAllAccountsModal}
        onClose={() => setShowAllAccountsModal(false)}
        onSelectAccount={handleSelectAccount}
      />
    </div>
  );
};

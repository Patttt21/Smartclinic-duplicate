import React from 'react';
import {
  X,
  ShieldCheck,
  FileText,
  Lock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Printer,
  HeartHandshake,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAgree?: () => void;
}

export const PrivacyPolicyModal: React.FC<Props> = ({ isOpen, onClose, onAgree }) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleAccept = () => {
    if (onAgree) onAgree();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-teal-50/70 via-slate-50 to-white dark:from-slate-900 dark:to-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-extrabold text-[10px] tracking-wider uppercase border border-teal-200 dark:border-teal-800">
                  Republic Act No. 10173
                </span>
                <span className="text-[10px] text-slate-400 font-mono">DPA 2012 COMPLIANT</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                Patient Medical Privacy Policy & Consent Agreement
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
          {/* Executive Summary Callout */}
          <div className="p-4 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-950 dark:text-teal-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs text-teal-900 dark:text-teal-100">
              <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>Smart Clinic Patient Privacy Commitment</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              In accordance with the <strong>Republic Act No. 10173 (Data Privacy Act of 2012)</strong>, the 
              <strong> National Privacy Commission (NPC)</strong>, and the <strong>Department of Health (DOH)</strong>, 
              Smart Clinic strictly safeguards your electronic medical records (EMR), personal identifying information (PII), 
              and clinical consultations. We do not sell, disclose, or share your medical data with unauthorized commercial third parties.
            </p>
          </div>

          {/* Section 1: Statutory Framework */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-teal-600" />
              <span>1. Statutory Framework & Lawful Basis</span>
            </h3>
            <p className="text-[11px]">
              This policy is formulated pursuant to RA 10173 and its Implementing Rules and Regulations (IRR). 
              Your medical health information is classified as <strong>Sensitive Personal Information (SPI)</strong> under 
              Section 13 of RA 10173. The processing of your data is carried out strictly for medical treatment, patient care management, 
              and outpatient health services under the supervision of licensed healthcare practitioners bound by professional confidentiality.
            </p>
          </div>

          {/* Section 2: Information Collected */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>2. Categories of Medical Data Collected</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <strong className="block text-slate-900 dark:text-slate-100 font-bold mb-0.5">Demographics & Identity:</strong>
                Legal name, date of birth, age, biological sex, residential address, emergency contact, and mobile phone number.
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <strong className="block text-slate-900 dark:text-slate-100 font-bold mb-0.5">Clinical & Diagnostic Records:</strong>
                Medical Record Number (MRN), vital signs (BP, heart rate, BMI), known allergies, chronic conditions, SOAP doctor notes, ICD-10 diagnostic codes, and lab results.
              </div>
            </div>
          </div>

          {/* Section 3: Technical Safeguards & Encryption */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-teal-600" />
              <span>3. Technical Security & Encryption Standards</span>
            </h3>
            <ul className="space-y-1.5 text-[11px] list-disc list-inside text-slate-600 dark:text-slate-300">
              <li>
                <strong>Cryptographic Salted Password Hashing:</strong> Passwords are never stored in plain text. They are hashed using industry-standard salted PBKDF2 (SHA-512 with 10,000 iterations).
              </li>
              <li>
                <strong>Brute-Force & Attempt Protection:</strong> Accounts are automatically locked for 15 minutes after 5 consecutive failed login attempts to prevent credential stuffing.
              </li>
              <li>
                <strong>Tenant Isolation:</strong> Strict data compartmentalization ensures each patient can only view their own confidential health record.
              </li>
              <li>
                <strong>Two-Factor Authentication (TOTP):</strong> High-privilege administrator actions mandate RFC 6238 rolling codes from Google Authenticator, Microsoft Authenticator, or Authy.
              </li>
              <li>
                <strong>Data in Transit & at Rest:</strong> All web traffic is encrypted with TLS 1.3 / 256-bit SSL protocols.
              </li>
              <li>
                <strong>Immutable Audit Logging:</strong> Every access to clinical patient charts is logged with timestamps, user role, and action descriptions for compliance auditing.
              </li>
            </ul>
          </div>

          {/* Section 4: Patient Rights */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
              <HeartHandshake className="w-3.5 h-3.5 text-teal-600" />
              <span>4. Your Rights as a Data Subject (RA 10173 Section 16)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <strong className="block text-teal-700 dark:text-teal-300 font-bold mb-0.5">Right to Access:</strong>
                Inspect your complete electronic medical records, lab reports, and prescriptions at any time.
              </div>
              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <strong className="block text-teal-700 dark:text-teal-300 font-bold mb-0.5">Right to Rectify:</strong>
                Request instant corrections to inaccurate demographic or medical information.
              </div>
              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <strong className="block text-teal-700 dark:text-teal-300 font-bold mb-0.5">Right to Portability:</strong>
                Request an electronic copy of your health records in standard printable/FHIR format.
              </div>
            </div>
          </div>

          {/* Section 5: Data Protection Officer */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1">
            <strong className="block font-bold text-slate-800 dark:text-slate-200">
              Data Protection Officer (DPO) Contact Information
            </strong>
            <p>
              Smart Clinic Outpatient Health Management System<br />
              Email: <span className="font-mono text-teal-600 dark:text-teal-400 font-bold">smartclinicrealacc@gmail.com</span> • Tel: <span className="font-semibold text-teal-600 dark:text-teal-400">Globe +639154050623</span><br />
              National Privacy Commission Registration No: NPC-REG-2026-PH-0084
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer self-start sm:self-auto"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Copy</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleAccept}
              className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-md shadow-teal-600/20 transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>I Agree & Accept Terms</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

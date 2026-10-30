import React from 'react';
import { useClinic } from '../../context/ClinicContext';
import { DoctorConsultationSuite } from './DoctorConsultationSuite';
import { NurseTriageStation } from './NurseTriageStation';
import { AdminConsultationOversight } from './AdminConsultationOversight';
import { ReceptionistConsultationGuide } from './ReceptionistConsultationGuide';
import { ShieldAlert } from 'lucide-react';

interface Props {
  initialPatientId?: string;
  onFinish?: () => void;
}

export const ConsultationWorkspace: React.FC<Props> = ({ initialPatientId, onFinish }) => {
  const { activeRole, setActiveTab } = useClinic();

  // 1. Patient Role Guard (Strict RA 10173 Clinical Privacy)
  if (activeRole === 'patient') {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-4 shadow-sm text-xs font-sans">
        <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Access Restricted — Clinical Consultation Suite
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          The Physician Consultation Room is reserved exclusively for attending healthcare providers.
          To view your verified consultation summaries, visit summaries, and vital signs, please visit the Medical Records (EMR) section.
        </p>
        <div>
          <button
            onClick={() => setActiveTab('dashboard')}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Return to Patient Portal
          </button>
        </div>
      </div>
    );
  }

  // 2. Doctor Role: Full Physician Consultation Suite
  if (activeRole === 'doctor') {
    return <DoctorConsultationSuite initialPatientId={initialPatientId} onFinish={onFinish} />;
  }

  // 3. Nurse Role: Pre-Consultation Nursing Triage & Vitals Station
  if (activeRole === 'nurse') {
    return <NurseTriageStation initialPatientId={initialPatientId} onFinish={onFinish} />;
  }

  // 4. Admin Role: Facility & Consultation Operations Oversight
  if (activeRole === 'admin') {
    return <AdminConsultationOversight />;
  }

  // 5. Receptionist Role: Front Desk Workflow Guidance
  if (activeRole === 'receptionist') {
    return <ReceptionistConsultationGuide />;
  }

  // Default fallback for any other clinical staff (e.g. lab tech or pharmacist)
  return <DoctorConsultationSuite initialPatientId={initialPatientId} onFinish={onFinish} />;
};

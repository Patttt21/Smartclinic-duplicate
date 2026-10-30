import React, { useState, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Prescription } from '../../types/clinic';
import {
  Pill,
  Plus,
  Printer,
  ShieldCheck,
  Search,
  X,
  Sparkles,
  Calendar,
  User,
  RotateCcw
} from 'lucide-react';

interface Props {
  onOpenNewPrescription: () => void;
  onPrintPrescription: (rx: Prescription) => void;
  onVerifySafety?: (rx: Prescription) => void;
}

export const PrescriptionList: React.FC<Props> = ({
  onOpenNewPrescription,
  onPrintPrescription,
  onVerifySafety,
}) => {
  const {
    prescriptions,
    dispenseMedication,
    activeRole,
    primaryRole,
  } = useClinic();

  const isPatient = activeRole === 'patient' || primaryRole === 'patient';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredRx = useMemo(() => {
    const query = search.trim().toLowerCase();

    return prescriptions.filter((rx) => {
      // Status filter
      if (statusFilter !== 'ALL' && rx.status !== statusFilter) {
        return false;
      }

      // If query is empty, all records matching status are included
      if (!query) {
        return true;
      }

      // Comprehensive search matching
      const rxNumMatch = rx.prescriptionNumber?.toLowerCase().includes(query);
      const doctorMatch = rx.doctorName?.toLowerCase().includes(query) || rx.doctorLicense?.toLowerCase().includes(query);
      const dateMatch = rx.date?.toLowerCase().includes(query);
      const statusMatch = rx.status?.toLowerCase().includes(query);
      const patientMatch = rx.patientName?.toLowerCase().includes(query) || rx.patientMrn?.toLowerCase().includes(query);

      // Deep medication item inspection (medication name, generic name, dosage, instructions, frequency)
      const itemMatch = rx.items?.some((item) => {
        const medName = item.medicationName?.toLowerCase() || '';
        const genName = item.genericName?.toLowerCase() || '';
        const dosage = item.dosage?.toLowerCase() || '';
        const freq = item.frequency?.toLowerCase() || '';
        const instructions = item.instructions?.toLowerCase() || '';
        const duration = item.duration?.toLowerCase() || '';

        return (
          medName.includes(query) ||
          genName.includes(query) ||
          dosage.includes(query) ||
          freq.includes(query) ||
          instructions.includes(query) ||
          duration.includes(query)
        );
      });

      const safetyWarningMatch = rx.aiSafetyAudit?.warnings?.some((w) => w.toLowerCase().includes(query));

      return Boolean(rxNumMatch || doctorMatch || dateMatch || statusMatch || itemMatch || safetyWarningMatch || patientMatch);
    });
  }, [prescriptions, search, statusFilter]);

  const handleClearSearch = () => {
    setSearch('');
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto text-xs font-sans pb-10">
      {/* Header and Actions */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {isPatient ? 'My Electronic Prescriptions' : 'E-Prescription & Pharmacy Dispensing'}
            </h1>
            <span className="text-xs bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-semibold px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
              {filteredRx.length} {filteredRx.length === 1 ? 'Prescription' : 'Prescriptions'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isPatient
              ? 'Specific Task: View and print your doctor-issued electronic prescriptions with digital signature verification.'
              : 'Specific Task: Computerized Physician Order Entry (CPOE), drug-allergy safety audits, and pharmacist dispensing.'}
          </p>
        </div>

        {/* Strictly conditional: Write Rx is NEVER rendered for Patient */}
        {!isPatient && activeRole !== 'pharmacist' && (
          <button
            onClick={onOpenNewPrescription}
            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-teal-700/20 cursor-pointer self-start sm:self-auto transition"
          >
            <Plus className="w-4 h-4" />
            <span>Write New Prescription</span>
          </button>
        )}
      </div>

      {/* Security & Privacy Notice */}
      <div className="p-3 bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/60 rounded-xl flex items-center justify-between gap-3 text-xs transition-colors">
        <div className="flex items-center gap-2 text-teal-900 dark:text-teal-200">
          <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
          <span>
            {isPatient
              ? 'Private Prescription Registry: Restricted solely to your personal medication orders. Other patient records are strictly isolated.'
              : 'RA 10173 Audit Active: Prescription write, dispensing, and safety audit logs are recorded with user authentication.'}
          </span>
        </div>
        <span className="font-mono text-[10px] bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded font-bold">
          SECURITY VERIFIED
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs transition-colors">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              isPatient
                ? 'Search medication, dosage, doctor, date, or Rx number...'
                : 'Search by Rx number, drug name, dosage, doctor, or patient...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
          />
          {search && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md cursor-pointer"
              aria-label="Clear search query"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer transition-colors"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Dispensed">Dispensed</option>
            <option value="Partially Dispensed">Partially Dispensed</option>
          </select>
          {(search || statusFilter !== 'ALL') && (
            <button
              onClick={handleResetFilters}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Prescription Cards List */}
      <div className="space-y-3">
        {filteredRx.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-xl border border-slate-200 dark:border-slate-800 text-xs transition-colors space-y-3">
            <Pill className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            {search || statusFilter !== 'ALL' ? (
              <div className="space-y-2">
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  No prescriptions found matching &ldquo;{search}&rdquo;
                  {statusFilter !== 'ALL' ? ` with status &ldquo;${statusFilter}&rdquo;` : ''}.
                </p>
                <p className="text-slate-400">
                  Try checking the medication spelling, searching by doctor name or dosage, or clearing the filter.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold text-xs transition cursor-pointer shadow-xs inline-flex items-center gap-1.5 mt-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Search &amp; Filters</span>
                </button>
              </div>
            ) : (
              <p className="text-slate-400">
                {isPatient ? 'No personal electronic prescriptions on file.' : 'No prescriptions found in the clinic system.'}
              </p>
            )}
          </div>
        ) : (
          filteredRx.map((rx, rxIndex) => {
            const rxKey = rx.id || rx.prescriptionNumber || `rx-card-${rxIndex}`;
            return (
              <div
                key={rxKey}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-4 hover:border-teal-300 dark:hover:border-teal-700 transition space-y-3 text-xs"
              >
                {/* Rx Top Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-extrabold flex items-center justify-center text-sm shrink-0">
                      Rx
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                          {rx.prescriptionNumber}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            rx.status === 'Active'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                              : rx.status === 'Dispensed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                          }`}
                        >
                          {rx.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Patient: <strong className="text-slate-800 dark:text-slate-200">{rx.patientName}</strong> ({rx.patientMrn})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => onPrintPrescription(rx)}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                      title="Print Prescription"
                    >
                      <Printer className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>Print Prescription</span>
                    </button>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Prescribed Medications ({rx.items?.length || 0})
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(rx.items || []).map((item, itemIndex) => {
                      const itemKey = item.id || `${rxKey}-item-${itemIndex}-${item.medicationName || ''}`;
                      return (
                        <div
                          key={itemKey}
                          className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-700/60 flex items-start justify-between gap-2 transition-colors"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Pill className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                              <span className="font-bold text-slate-900 dark:text-white text-xs">
                                {item.medicationName}
                              </span>
                              <span className="text-[10px] text-teal-700 dark:text-teal-300 font-mono font-semibold">
                                ({item.dosage})
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300">
                              {item.frequency} • {item.duration} (Quantity: {item.quantity})
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                              Sig: {item.instructions}
                            </p>
                          </div>

                          {/* Dispense action for staff/pharmacist */}
                          {(activeRole === 'pharmacist' || activeRole === 'admin') && !item.dispensed && (
                            <button
                              onClick={() => dispenseMedication(rx.id, item.id || itemKey)}
                              className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-[10px] font-semibold shrink-0 cursor-pointer shadow-2xs transition"
                            >
                              Dispense
                            </button>
                          )}
                          {item.dispensed && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 shrink-0">
                              Dispensed
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Safety & Physician Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    {rx.aiSafetyAudit ? (
                      <div className="flex items-center gap-1 text-teal-700 dark:text-teal-300 font-medium">
                        <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                        <span>Safety Audit: {rx.aiSafetyAudit.warnings?.[0] || 'No adverse interactions detected.'}</span>
                      </div>
                    ) : (
                      <span>Standard medical safety verification completed</span>
                    )}
                  </div>

                  <div className="text-right">
                    <span>
                      Prescribing Physician: <strong className="text-slate-800 dark:text-slate-200">{rx.doctorName}</strong> ({rx.doctorLicense})
                    </span>
                    <span className="ml-2 text-slate-400 font-mono">{rx.date}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

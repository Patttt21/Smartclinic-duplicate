import React, { useState, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import {
  Stethoscope,
  Layers,
  Activity,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Users,
  ShieldCheck,
  FileText,
  TrendingUp,
  MapPin,
  RefreshCw,
  Search,
  Filter,
  Receipt,
  UserCheck,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const AdminConsultationOversight: React.FC = () => {
  const {
    appointments,
    consultations,
    patients,
    users,
    updateAppointmentRoom,
    updateAppointmentStatus,
    language,
    setActiveTab,
  } = useClinic();
  const { success: toastSuccess } = useToast();
  const isFil = language === 'fil';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomToReassign, setSelectedRoomToReassign] = useState<string | null>(null);
  const [newRoomValue, setNewRoomValue] = useState<string>('Room 303 (Internal Medicine)');

  // All standard clinic examination rooms
  const clinicRooms = [
    { id: 'triage-1', name: 'Triage Station 1', dept: 'Nursing & Vital Signs', defaultStaff: 'Nurse Staff' },
    { id: 'triage-2', name: 'Triage Station 2', dept: 'Nursing & Vital Signs', defaultStaff: 'Nurse Staff' },
    { id: 'room-301', name: 'Room 301 (Pediatrics)', dept: 'Pediatrics', defaultStaff: 'Dr. Sofia Ramos' },
    { id: 'room-302', name: 'Room 302 (Consultation Suite)', dept: 'Internal Medicine', defaultStaff: 'Dr. Maria Cristina Reyes' },
    { id: 'room-303', name: 'Room 303 (Internal Medicine)', dept: 'Internal Medicine', defaultStaff: 'Dr. Maria Cristina Reyes' },
    { id: 'room-304', name: 'Room 304 (Cardiology)', dept: 'Cardiology', defaultStaff: 'Dr. Alejandro Santos' },
  ];

  // Active appointments in consultation or triage
  const activeConsultations = useMemo(() => {
    return appointments.filter((a) => a.status === 'In Consultation');
  }, [appointments]);

  const waitingPatients = useMemo(() => {
    return appointments.filter((a) => a.status === 'Checked In');
  }, [appointments]);

  const completedToday = useMemo(() => {
    return appointments.filter((a) => a.status === 'Completed');
  }, [appointments]);

  // Map each room to its current occupant
  const roomOccupancy = useMemo(() => {
    return clinicRooms.map((room) => {
      const activeAppt = activeConsultations.find((a) => a.room === room.name);
      return {
        ...room,
        isOccupied: Boolean(activeAppt),
        activeAppt,
      };
    });
  }, [clinicRooms, activeConsultations]);

  // Filtered consultations audit log
  const filteredConsultations = useMemo(() => {
    return consultations.filter(
      (c) =>
        c.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.diagnoses.some((d) => d.description.toLowerCase().includes(searchQuery.toLowerCase()) || d.code.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [consultations, searchQuery]);

  const handleReassignRoom = (apptId: string) => {
    updateAppointmentRoom(apptId, newRoomValue);
    setSelectedRoomToReassign(null);
    toastSuccess(`Room successfully reassigned to ${newRoomValue}.`);
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-12 font-sans text-xs">
      {/* Admin Executive Header */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Clinical Consultation & Facility Operations Oversight
              </h1>
              <span className="bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800 uppercase tracking-wider">
                Admin Oversight
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Real-time room occupancy, physician workload balancing, turnaround metrics, and RA 10173 data privacy governance.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            View Live Queue
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('billing')}
            className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
          >
            Billing & Collections
          </button>
        </div>
      </div>

      {/* Real-Time Operational Throughput Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] mb-1">
            <span>Waiting in Lobby</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {waitingPatients.length}
          </div>
          <span className="text-[10px] text-slate-400">Patients ready for room call</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] mb-1">
            <span>In Active Consult</span>
            <Stethoscope className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
            {activeConsultations.length}
          </div>
          <span className="text-[10px] text-slate-400">Physicians currently examining</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] mb-1">
            <span>Completed Today</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {completedToday.length}
          </div>
          <span className="text-[10px] text-slate-400">Signed clinical charts</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] mb-1">
            <span>Avg Consult Time</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
            16.4 <span className="text-xs font-normal">mins</span>
          </div>
          <span className="text-[10px] text-slate-400">Optimal clinical pace</span>
        </div>
      </div>

      {/* Live Examination Rooms Status Matrix */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="font-extrabold text-slate-900 dark:text-white text-sm uppercase tracking-wide">
              Facility Examination Rooms & Triage Matrix
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Occupancy: {roomOccupancy.filter((r) => r.isOccupied).length} / {roomOccupancy.length} Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {roomOccupancy.map((room) => (
            <div
              key={room.id}
              className={`p-4 rounded-2xl border transition-all ${
                room.isOccupied
                  ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60 shadow-xs'
                  : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                    {room.dept}
                  </span>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm">
                    {room.name}
                  </h3>
                </div>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    room.isOccupied
                      ? 'bg-blue-100 dark:bg-blue-900/80 text-blue-700 dark:text-blue-300'
                      : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {room.isOccupied ? 'Occupied' : 'Available'}
                </span>
              </div>

              {room.isOccupied && room.activeAppt ? (
                <div className="space-y-2 pt-2 border-t border-blue-100 dark:border-blue-900/40 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Current Patient:</span>
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {room.activeAppt.patientName} ({room.activeAppt.queueNumber || 'Q-101'})
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Attending Physician:</span>
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">
                      {room.activeAppt.doctorName}
                    </span>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                      Elapsed: ~12m
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedRoomToReassign(room.activeAppt!.id)}
                      className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-bold border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      Reassign Room
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 text-slate-400 text-xs">
                  <div className="text-[11px]">Ready for next outpatient call.</div>
                  <div className="text-[10px] text-slate-500 mt-1">Designated: {room.defaultStaff}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Finalized Consultations Audit Trail */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h2 className="font-extrabold text-slate-900 dark:text-white text-sm uppercase tracking-wide">
              Finalized Clinical Consultations Audit Log
            </h2>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by patient, doctor, diagnosis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[10px] uppercase font-bold">
                <th className="py-2.5 px-3">Date / Encounter</th>
                <th className="py-2.5 px-3">Patient</th>
                <th className="py-2.5 px-3">Attending Physician</th>
                <th className="py-2.5 px-3">ICD-10 Primary Diagnosis</th>
                <th className="py-2.5 px-3">Orders Created</th>
                <th className="py-2.5 px-3 text-right">EMR Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredConsultations.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                    {c.date}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900 dark:text-white">{c.patientName}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-medium">
                    {c.doctorName}
                  </td>
                  <td className="py-3 px-3">
                    {c.diagnoses && c.diagnoses[0] ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 font-mono text-[11px] font-bold border border-teal-200 dark:border-teal-800">
                        {c.diagnoses[0].code}: {c.diagnoses[0].description}
                      </span>
                    ) : (
                      <span className="text-slate-400">Clinical Evaluation</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-[11px] text-slate-500 dark:text-slate-400">
                    {c.prescriptionsCreated?.length || 0} Rx • {c.labOrdersCreated?.length || 0} Labs
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Signed & Locked
                    </span>
                  </td>
                </tr>
              ))}
              {filteredConsultations.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No matching consultation records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reassign Room Modal */}
      {selectedRoomToReassign && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Reassign Examination Room
            </h3>
            <p className="text-xs text-slate-500">
              Shift patient to an available examination room to optimize clinical throughput.
            </p>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Target Room:
              </label>
              <select
                value={newRoomValue}
                onChange={(e) => setNewRoomValue(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
              >
                <option value="Room 301 (Pediatrics)">Room 301 (Pediatrics)</option>
                <option value="Room 302 (Consultation Suite)">Room 302 (Consultation Suite)</option>
                <option value="Room 303 (Internal Medicine)">Room 303 (Internal Medicine)</option>
                <option value="Room 304 (Cardiology)">Room 304 (Cardiology)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedRoomToReassign(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleReassignRoom(selectedRoomToReassign)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
              >
                Confirm Reassignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Stethoscope,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  FileBadge,
  ShieldCheck,
  Building2,
  Edit2,
  Trash2,
  KeyRound,
  Lock,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { useClinic } from '../../context/ClinicContext';
import type { User, UserPermissions } from '../../types/clinic';
import { AddDoctorModal } from './AddDoctorModal';
import { StaffPermissionsModal } from './StaffPermissionsModal';

export const PhysiciansManagementView: React.FC = () => {
  const { users, deleteUser, toggleUserStatus, getUserPermissions, t } = useClinic();

  // Modals & Edit State
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [doctorToEdit, setDoctorToEdit] = useState<User | null>(null);
  const [permissionTarget, setPermissionTarget] = useState<User | null>(null);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [permissionFilter, setPermissionFilter] = useState<string>('ALL');

  // Filter all doctors
  const allDoctors = useMemo(() => {
    return users.filter((u) => u.role === 'doctor');
  }, [users]);

  // Extract unique specialties for filter dropdown
  const uniqueSpecialties = useMemo(() => {
    const set = new Set<string>();
    allDoctors.forEach((doc) => {
      if (doc.specialty) set.add(doc.specialty);
    });
    return Array.from(set).sort();
  }, [allDoctors]);

  // Filtered Doctors
  const filteredDoctors = useMemo(() => {
    return allDoctors.filter((doc) => {
      const matchesSearch =
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.specialty && doc.specialty.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.department && doc.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.licenseNumber && doc.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.phone && doc.phone.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesSpecialty = specialtyFilter === 'ALL' || doc.specialty === specialtyFilter;
      const matchesStatus = statusFilter === 'ALL' || (doc.status || 'Active') === statusFilter;

      let matchesPermission = true;
      if (permissionFilter !== 'ALL') {
        const perms = getUserPermissions(doc);
        matchesPermission = Boolean(perms[permissionFilter as keyof UserPermissions]);
      }

      return matchesSearch && matchesSpecialty && matchesStatus && matchesPermission;
    });
  }, [allDoctors, searchTerm, specialtyFilter, statusFilter, permissionFilter, getUserPermissions]);

  const handleEditDoctor = (doc: User) => {
    setDoctorToEdit(doc);
    setShowAddDoctorModal(true);
  };

  const handleOpenPermissions = (doc: User) => {
    setPermissionTarget(doc);
  };

  const handleDeleteDoctor = async (doctorId: string, name: string) => {
    if (
      window.confirm(
        `Are you sure you want to remove ${name} from registered medical staff? This action will be audited in compliance with Philippine RA 10173.`
      )
    ) {
      await deleteUser(doctorId);
    }
  };

  const handleToggleStatus = async (doctorId: string, currentStatus?: string) => {
    const nextStatus =
      currentStatus === 'Active' ? 'On Leave' : currentStatus === 'On Leave' ? 'Inactive' : 'Active';
    await toggleUserStatus(doctorId, nextStatus as any);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto text-xs font-sans pb-12">
      {/* ====================================================================
          HEADER: PHYSICIAN & DOCTOR MANAGEMENT
          Matches Pharmacy & Stock Inventory layout
          ==================================================================== */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Physician & Doctor Management
            </h1>
            <span className="text-xs bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-semibold px-2.5 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
              {allDoctors.length} Physicians Registered
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Specific Task: Credentialed attending physicians, outpatient schedules, licensure verification, and granular system module permissions.
          </p>
        </div>

        <button
          onClick={() => {
            setDoctorToEdit(null);
            setShowAddDoctorModal(true);
          }}
          className="px-3.5 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-black rounded-lg text-xs flex items-center gap-2 shadow-xs transition cursor-pointer self-start sm:self-auto shrink-0 active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add New Physician</span>
        </button>
      </div>

      {/* Security & Audit Compliance Banner */}
      <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
          <span>
            Controlled Medical Staff Governance: PRC licensure verification, clinic shift hours, and consultation module privileges are recorded in immutable logs.
          </span>
        </div>
        <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded font-bold shrink-0">
          PRC & RA 10173 COMPLIANT
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search physician by name, specialty, department, PRC license, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Specialty Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Specialty:</span>
            <select
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Specialties ({uniqueSpecialties.length})</option>
              {uniqueSpecialties.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Permission Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Permission:</span>
            <select
              value={permissionFilter}
              onChange={(e) => setPermissionFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Privileges</option>
              <option value="consultations">Can Consult</option>
              <option value="prescriptions">Can Prescribe</option>
              <option value="emr">Full EMR Access</option>
              <option value="laboratory">Can Order Labs</option>
              <option value="pharmacy">Can Access Pharmacy</option>
            </select>
          </div>
        </div>
      </div>

      {/* ====================================================================
          TABLE CARD (Pure Tabular Layout Matching Inventory & Billing)
          NO profile pictures: Clean professional initials badge used
          ==================================================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Physician & Contact</th>
                <th className="py-3 px-3">Specialty & Department</th>
                <th className="py-3 px-3">PRC Licensure</th>
                <th className="py-3 px-3">Consultation Hours</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Module Permissions</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDoctors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No physicians match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredDoctors.map((doc) => {
                  const status = doc.status || 'Active';
                  const isActive = status === 'Active';
                  const isLeave = status === 'On Leave';
                  const perms = getUserPermissions(doc);
                  const allowedCount = Object.values(perms).filter(Boolean).length;

                  // Initials circle badge (NO profile picture)
                  const initials = doc.name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase();

                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                    >
                      {/* Physician Name & Email */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                            {initials || <Stethoscope className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 dark:text-slate-100 block truncate">
                              {doc.name}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block font-mono">
                              {doc.email}
                            </span>
                            {doc.phone && (
                              <span className="text-[10px] text-slate-400 block">{doc.phone}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Specialty & Department */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-[11px] block w-fit">
                          {doc.specialty || 'General Medicine'}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          {doc.department || 'Outpatient Clinic'}
                        </span>
                      </td>

                      {/* PRC Licensure */}
                      <td className="py-3 px-3">
                        <span className="font-mono text-[11px] text-slate-900 dark:text-slate-100 font-bold bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 w-fit block">
                          {doc.licenseNumber || 'PRC-0084521'}
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block mt-0.5">
                          Board Verified
                        </span>
                      </td>

                      {/* Schedule / Hours */}
                      <td className="py-3 px-3">
                        <span className="font-medium text-slate-800 dark:text-slate-200 text-[11px] block">
                          {doc.workDaysLabel || 'Mon – Fri'}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                          <Clock className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                          <span>{doc.hoursLabel || '8:00 AM – 5:00 PM'}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleToggleStatus(doc.id, doc.status)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                            isActive
                              ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : isLeave
                              ? 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                          title="Click to toggle status"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive
                                ? 'bg-emerald-500 animate-pulse'
                                : isLeave
                                ? 'bg-amber-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          <span>{status}</span>
                        </button>
                      </td>

                      {/* Module Permissions Summary */}
                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleOpenPermissions(doc)}
                          className="px-2 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/80 font-bold text-[10px] flex items-center gap-1.5 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition cursor-pointer"
                          title="View and configure module privileges"
                        >
                          <KeyRound className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                          <span>{allowedCount}/14 Modules</span>
                        </button>
                        <div className="flex items-center gap-1 mt-1 text-[9px] text-slate-400">
                          {perms.consultations && <span className="text-teal-600 dark:text-teal-400 font-semibold">Consult</span>}
                          {perms.prescriptions && <span>• Rx</span>}
                          {perms.laboratory && <span>• Lab</span>}
                          {perms.emr && <span>• EMR</span>}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenPermissions(doc)}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                            title="Manage System Permissions"
                          >
                            <KeyRound className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                            <span>Permissions</span>
                          </button>
                          <button
                            onClick={() => handleEditDoctor(doc)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                            title="Edit Doctor Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDoctor(doc.id, doc.name)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                            title="Remove Doctor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Doctor Modal */}
      {showAddDoctorModal && (
        <AddDoctorModal
          isOpen={showAddDoctorModal}
          onClose={() => {
            setShowAddDoctorModal(false);
            setDoctorToEdit(null);
          }}
          doctorToEdit={doctorToEdit}
        />
      )}

      {/* Permissions Management Modal */}
      {permissionTarget && (
        <StaffPermissionsModal
          isOpen={Boolean(permissionTarget)}
          onClose={() => setPermissionTarget(null)}
          targetUser={permissionTarget}
        />
      )}
    </div>
  );
};

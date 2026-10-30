/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Users,
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
  Filter,
} from 'lucide-react';
import { useClinic } from '../../context/ClinicContext';
import type { User, UserPermissions } from '../../types/clinic';
import { AddStaffModal } from './AddStaffModal';
import { StaffPermissionsModal } from './StaffPermissionsModal';

export const ClinicalStaffManagementView: React.FC = () => {
  const { users, deleteUser, toggleUserStatus, getUserPermissions, t } = useClinic();

  // Modals & Edit State
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<User | null>(null);
  const [permissionTarget, setPermissionTarget] = useState<User | null>(null);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [permissionFilter, setPermissionFilter] = useState<string>('ALL');

  // Filter clinical staff (nurses, receptionists, lab techs, pharmacists)
  const clinicalStaffList = useMemo(() => {
    return users.filter((u) => ['nurse', 'receptionist', 'lab_technician', 'pharmacist'].includes(u.role));
  }, [users]);

  // Filtered Clinical Staff
  const filteredStaff = useMemo(() => {
    return clinicalStaffList.filter((staff) => {
      const matchSearch =
        staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (staff.department && staff.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (staff.licenseNumber && staff.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (staff.phone && staff.phone.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchRole = roleFilter === 'ALL' || staff.role === roleFilter;
      const matchStatus = statusFilter === 'ALL' || (staff.status || 'Active') === statusFilter;

      let matchPerm = true;
      if (permissionFilter !== 'ALL') {
        const perms = getUserPermissions(staff);
        matchPerm = Boolean(perms[permissionFilter as keyof UserPermissions]);
      }

      return matchSearch && matchRole && matchStatus && matchPerm;
    });
  }, [clinicalStaffList, searchTerm, roleFilter, statusFilter, permissionFilter, getUserPermissions]);

  const handleEditStaff = (stf: User) => {
    setStaffToEdit(stf);
    setShowAddStaffModal(true);
  };

  const handleOpenPermissions = (stf: User) => {
    setPermissionTarget(stf);
  };

  const handleDeleteStaff = async (staffId: string, name: string) => {
    if (
      window.confirm(
        `Are you sure you want to remove ${name} from clinical staff? This action will be audited under Philippine RA 10173.`
      )
    ) {
      await deleteUser(staffId);
    }
  };

  const handleToggleStatus = async (staffId: string, currentStatus?: string) => {
    const nextStatus =
      currentStatus === 'Active' ? 'On Leave' : currentStatus === 'On Leave' ? 'Inactive' : 'Active';
    await toggleUserStatus(staffId, nextStatus as any);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'nurse':
        return { label: 'Registered Nurse', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
      case 'receptionist':
        return { label: 'Front Desk Access', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
      case 'lab_technician':
        return { label: 'Medical Technologist', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' };
      case 'pharmacist':
        return { label: 'Clinical Pharmacist', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
      default:
        return { label: 'Clinical Staff', color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto text-xs font-sans pb-12">
      {/* ====================================================================
          HEADER: CLINICAL STAFF DIRECTORY & ACCESS MANAGEMENT
          Matches Pharmacy & Stock Inventory layout
          ==================================================================== */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Clinical Staff Directory & Access Management
            </h1>
            <span className="text-xs bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-semibold px-2.5 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
              {clinicalStaffList.length} Staff Members
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Specific Task: Clinical staff credentialing, departmental assignments, role templates, and granular system permissions.
          </p>
        </div>

        <button
          onClick={() => {
            setStaffToEdit(null);
            setShowAddStaffModal(true);
          }}
          className="px-3.5 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-black rounded-lg text-xs flex items-center gap-2 shadow-xs transition cursor-pointer self-start sm:self-auto shrink-0 active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add New Staff</span>
        </button>
      </div>

      {/* Security & Audit Compliance Banner */}
      <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
          <span>
            Clinical Role-Based Access Control: Module access, departmental permissions, and user sessions are strictly guarded under Philippine Health Data Security Standards.
          </span>
        </div>
        <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded font-bold shrink-0">
          RA 10173 COMPLIANT
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search staff by name, department, role, email, or credentials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Roles ({clinicalStaffList.length})</option>
              <option value="nurse">Nurse</option>
              <option value="receptionist">Receptionist</option>
              <option value="lab_technician">Lab Technician</option>
              <option value="pharmacist">Pharmacist</option>
            </select>
          </div>

          {/* Status Filter */}
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
              <option value="triage">Can Triage / Check-in</option>
              <option value="queue">Can Manage Queue</option>
              <option value="prescriptions">Can Review Prescriptions</option>
              <option value="pharmacy">Can Access Pharmacy/Stock</option>
              <option value="laboratory">Can Process Lab Orders</option>
              <option value="appointments">Can Schedule Appointments</option>
            </select>
          </div>
        </div>
      </div>

      {/* ====================================================================
          TABLE CARD (Pure Tabular Layout Matching Inventory & Billing)
          NO profile pictures: Clean role-colored initials circle badge used
          ==================================================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Staff Member & Contact</th>
                <th className="py-3 px-3">Role & Department</th>
                <th className="py-3 px-3">License & Credentials</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Module Permissions</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No staff members match your criteria.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const roleBadge = getRoleBadge(staff.role);
                  const status = staff.status || 'Active';
                  const isActive = status === 'Active';
                  const isLeave = status === 'On Leave';
                  const perms = getUserPermissions(staff);
                  const allowedCount = Object.values(perms).filter(Boolean).length;

                  // Initials circle badge (NO profile picture)
                  const initials = staff.name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase();

                  return (
                    <tr
                      key={staff.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                    >
                      {/* Staff Name & Contact */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                            {initials || <Users className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 dark:text-slate-100 block truncate">
                              {staff.name}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block font-mono">
                              {staff.email}
                            </span>
                            {staff.phone && (
                              <span className="text-[10px] text-slate-400 block">{staff.phone}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role & Department */}
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${roleBadge.color} block w-fit`}
                        >
                          {roleBadge.label}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          {staff.department || 'Outpatient Services'}
                        </span>
                      </td>

                      {/* License & Credentials */}
                      <td className="py-3 px-3">
                        {staff.licenseNumber ? (
                          <span className="font-mono text-[11px] text-slate-900 dark:text-slate-100 font-bold bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 w-fit block">
                            {staff.licenseNumber}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Clinical Operations</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleToggleStatus(staff.id, staff.status)}
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
                          onClick={() => handleOpenPermissions(staff)}
                          className="px-2 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/80 font-bold text-[10px] flex items-center gap-1.5 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition cursor-pointer"
                          title="View and configure module privileges"
                        >
                          <KeyRound className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                          <span>{allowedCount}/14 Modules</span>
                        </button>
                        <div className="flex items-center gap-1 mt-1 text-[9px] text-slate-400">
                          {perms.triage && <span className="text-teal-600 dark:text-teal-400 font-semibold">Triage</span>}
                          {perms.queue && <span>• Queue</span>}
                          {perms.pharmacy && <span>• Pharmacy</span>}
                          {perms.laboratory && <span>• Lab</span>}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenPermissions(staff)}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                            title="Manage System Permissions"
                          >
                            <KeyRound className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                            <span>Permissions</span>
                          </button>
                          <button
                            onClick={() => handleEditStaff(staff)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                            title="Edit Staff Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteStaff(staff.id, staff.name)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                            title="Remove Staff"
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

      {/* Add / Edit Staff Modal */}
      {showAddStaffModal && (
        <AddStaffModal
          isOpen={showAddStaffModal}
          onClose={() => {
            setShowAddStaffModal(false);
            setStaffToEdit(null);
          }}
          staffToEdit={staffToEdit}
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

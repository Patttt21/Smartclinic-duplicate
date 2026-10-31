import React, { useState, useRef, useEffect } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { SmartClinicLogo } from '../common/SmartClinicLogo';
import { NotificationDetailModal } from '../notifications/NotificationDetailModal';
import { canUserScanQR } from '../../utils/qrPermissions';
import { isSupabaseConfigured } from '../../lib/supabase';
import type { Notification } from '../../types/clinic';
import {
  Search,
  Bell,
  Clock,
  User,
  X,
  Database,
  LogOut,
  Lock,
  QrCode,
  Menu,
} from 'lucide-react';

interface Props {
  onOpenBookAppointment?: () => void;
  onOpenNewPatient?: () => void;
  onOpenSupabaseModal?: () => void;
  onOpenScanQR?: () => void;
  onOpenProfileSettings?: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<Props> = ({
  onOpenBookAppointment,
  onOpenNewPatient,
  onOpenSupabaseModal,
  onOpenScanQR,
  onOpenProfileSettings,
  onToggleMobileMenu,
}) => {
  const {
    currentUser,
    activeRole,
    primaryRole,
    staffSubRole,
    notifications,
    unreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    searchQuery,
    setSearchQuery,
    patients,
    appointments,
    inventory,
    selectPatient,
    activeTab,
    setActiveTab,
    logout,
    language,
    t,
    sessionSecondsRemaining,
    isAuthenticated,
  } = useClinic();

  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotifModal, setSelectedNotifModal] = useState<Notification | null>(null);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const unreadCount = unreadNotificationCount;

  const isPatient = activeRole === 'patient';
  const isAdmin = activeRole === 'admin';

  // Search filtered results for staff roles ONLY
  const filteredPatients =
    !isPatient && searchQuery.trim()
      ? patients.filter(
          (p) =>
            p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.phone.includes(searchQuery)
        )
      : [];
  const filteredAppointments =
    !isPatient && searchQuery.trim()
      ? appointments.filter(
          (a) =>
            a.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.reason.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : [];
  const filteredInventory =
    !isPatient && (activeRole === 'pharmacist' || activeRole === 'doctor' || activeRole === 'admin') && searchQuery.trim()
      ? inventory.filter(
          (i) =>
            i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            i.genericName.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearchDropdown(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = currentUser.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <header className="bg-[#0b1120]/95 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-30 select-none shadow-md shadow-black/25">
      <div className="px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 sm:gap-4">
        {/* Left: Branding & Logo Area */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              type="button"
              className="lg:hidden p-1.5 -ml-1 text-slate-300 hover:bg-slate-800 rounded-xl transition cursor-pointer active:scale-95"
              aria-label="Toggle navigation menu"
              title="Open Navigation"
            >
              <Menu className="w-5 h-5 text-slate-200" />
            </button>
          )}
          <div
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-95 transition select-none group"
            title="Go to Dashboard"
          >
            <SmartClinicLogo className="w-8 h-8 sm:w-9 sm:h-9 group-hover:scale-105 transition" glow={true} />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-white text-base tracking-tight leading-none">Smart Clinic</span>
                <span className="bg-gradient-to-r from-teal-500/20 to-cyan-500/20 text-cyan-300 font-bold text-[10px] px-2 py-0.5 rounded-full border border-cyan-500/30 uppercase tracking-wide">
                  {isPatient ? 'Patient Portal' : isAdmin ? 'Executive Governance' : 'Clinical Hub'}
                </span>
                <span className="hidden xl:inline-flex items-center gap-1 bg-emerald-950/60 text-emerald-300 font-bold text-[9px] px-2 py-0.5 rounded-md border border-emerald-500/40 uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  RBAC Protected
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium leading-tight hidden sm:block mt-0.5">
                {isPatient
                  ? 'Confidential Patient Health Portal'
                  : isAdmin
                  ? 'Executive Administration & Governance'
                  : 'Outpatient Healthcare Management'}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Search Box & Navigation Shortcuts */}
        {!isPatient ? (
          <div className="hidden md:flex items-center gap-3 flex-1 max-w-xl mx-2">
            <div className="flex-1 relative" ref={searchRef}>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search authorized clinical records, patients, EMR…"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchDropdown(Boolean(e.target.value.trim()));
                  }}
                  onFocus={() => {
                    if (searchQuery.trim()) setShowSearchDropdown(true);
                  }}
                  className="w-full bg-[#11192c] hover:bg-[#142038] focus:bg-[#142038] border border-slate-700/80 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition shadow-inner"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setShowSearchDropdown(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Search Dropdown */}
              {showSearchDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#0e1628] border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto">
                  <div className="p-2.5 border-b border-slate-800 bg-[#121c33] text-[11px] font-semibold text-slate-300 flex justify-between items-center">
                    <span>Search results for "{searchQuery}"</span>
                    <button
                      onClick={() => setShowSearchDropdown(false)}
                      className="text-slate-400 hover:text-white text-[10px]"
                    >
                      Close
                    </button>
                  </div>
                  {filteredPatients.length > 0 && (
                    <div className="p-2">
                      <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider px-2 py-1">Patients</p>
                      {filteredPatients.map((pat) => (
                        <button
                          key={pat.id}
                          onClick={() => {
                            selectPatient(pat.id);
                            setActiveTab('patients');
                            setShowSearchDropdown(false);
                            setSearchQuery('');
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-[#162342] flex items-center justify-between text-xs transition cursor-pointer"
                        >
                          <div>
                            <span className="font-semibold text-white">{pat.fullName}</span>
                            <span className="ml-2 text-slate-400 font-mono text-[11px]">{pat.mrn}</span>
                          </div>
                          <span className="text-[11px] text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-lg font-medium">
                            {pat.age}y • {pat.gender}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {filteredAppointments.length > 0 && (
                    <div className="p-2 border-t border-slate-800">
                      <p className="text-[10px] font-bold text-teal-400 uppercase tracking-wider px-2 py-1">Appointments</p>
                      {filteredAppointments.map((apt) => (
                        <button
                          key={apt.id}
                          onClick={() => {
                            setActiveTab('appointments');
                            setShowSearchDropdown(false);
                            setSearchQuery('');
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-[#162342] text-xs transition cursor-pointer"
                        >
                          <span className="font-semibold text-white">{apt.patientName}</span>
                          <span className="ml-2 text-slate-400 text-[11px]">
                            {apt.doctorName} · {apt.reason}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {filteredInventory.length > 0 && (
                    <div className="p-2 border-t border-slate-800">
                      <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider px-2 py-1">Formulary</p>
                      {filteredInventory.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab('inventory');
                            setShowSearchDropdown(false);
                            setSearchQuery('');
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-[#162342] text-xs transition cursor-pointer"
                        >
                          <span className="font-semibold text-white">{item.name}</span>
                          <span className="ml-2 text-slate-400 text-[11px]">{item.genericName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {filteredPatients.length === 0 &&
                    filteredAppointments.length === 0 &&
                    filteredInventory.length === 0 && (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No matching clinical records found for "{searchQuery}".
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 max-w-lg hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-teal-950/40 border border-teal-500/30 text-teal-200 text-xs font-medium">
            <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">Role-Based Isolated Session · Personal Health Record Only</span>
          </div>
        )}

        {/* Right: User / Profile / Security Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Inactivity Session Timer Indicator */}
          {isAuthenticated && (
            <div
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-mono font-bold tabular-nums border transition ${
                sessionSecondsRemaining <= 60
                  ? 'bg-amber-950/80 text-amber-300 border-amber-500'
                  : 'bg-[#11192c] text-cyan-300 border-slate-700/80 shadow-xs'
              }`}
              title={`${t.common.sessionRemaining}: ${Math.floor(sessionSecondsRemaining / 60)}m ${
                sessionSecondsRemaining % 60
              }s`}
            >
              <Clock
                className={`w-3.5 h-3.5 ${
                  sessionSecondsRemaining <= 60 ? 'text-amber-400' : 'text-cyan-400'
                }`}
              />
              <span>
                {Math.floor(sessionSecondsRemaining / 60)}:{sessionSecondsRemaining % 60 < 10 ? '0' : ''}
                {sessionSecondsRemaining % 60}
              </span>
            </div>
          )}

          {/* Appointment QR Scanner (Nurses & Receptionists) */}
          {!isPatient && onOpenScanQR && canUserScanQR(activeRole, primaryRole, staffSubRole) && (
            <button
              onClick={() => onOpenScanQR()}
              className="px-2.5 py-1.5 text-xs font-semibold text-cyan-200 bg-[#11192c] hover:bg-[#16233d] border border-cyan-500/30 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
              title="Scan Appointment QR"
            >
              <QrCode className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden lg:inline">Scan Appointment QR</span>
            </button>
          )}

          {/* Supabase Hub (Admin Only) */}
          {isAdmin && onOpenSupabaseModal && (
            <button
              onClick={onOpenSupabaseModal}
              className={`p-1.5 px-2.5 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95 border ${
                isSupabaseConfigured()
                  ? 'text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/50 border-emerald-500/40'
                  : 'text-amber-300 bg-amber-950/50 hover:bg-amber-900/50 border-amber-500/40'
              }`}
              title={
                isSupabaseConfigured()
                  ? 'Open Supabase Cloud Database (Connected)'
                  : 'Demo Mode (In-Memory) — Click to configure V2 Supabase Cloud Database'
              }
            >
              <Database
                className={`w-3.5 h-3.5 ${
                  isSupabaseConfigured() ? 'text-emerald-400' : 'text-amber-400'
                }`}
              />
              <span className="hidden sm:inline text-[11px]">
                {isSupabaseConfigured() ? 'Database' : 'Demo DB'}
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isSupabaseConfigured() ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              ></span>
            </button>
          )}

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition relative cursor-pointer"
              title={t.nav.notifications}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-gradient-to-r from-teal-400 to-cyan-400 text-slate-950 rounded-full text-[9px] font-black flex items-center justify-center animate-pulse shadow-sm shadow-cyan-500/40">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[#0e1628] border border-slate-700/90 rounded-2xl shadow-2xl z-50 overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-150">
                <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-[#121c33]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">Notifications</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                      {isPatient ? 'Patient' : isAdmin ? 'Admin' : 'Provider'}
                    </span>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllNotificationsAsRead}
                      className="text-[11px] text-cyan-400 font-semibold hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-800">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 space-y-1">
                      <p className="font-medium text-slate-200">No notifications</p>
                      <p className="text-[11px] text-slate-500">All caught up for your role!</p>
                    </div>
                  ) : (
                    notifications.slice(0, 4).map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          markNotificationAsRead(notif.id);
                          setSelectedNotifModal(notif);
                          setShowNotifications(false);
                        }}
                        className={`p-3 text-xs transition cursor-pointer hover:bg-[#14223d] ${
                          !notif.read ? 'bg-cyan-950/20' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-white truncate text-xs">{notif.title}</p>
                          {!notif.read && <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />}
                        </div>
                        <p className="text-slate-300 text-[11px] mt-0.5 line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>
                        <p className="text-slate-500 text-[10px] mt-1">
                          {notif.createdAt || notif.timestamp
                            ? new Date(notif.createdAt || notif.timestamp || '').toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Just now'}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2.5 border-t border-slate-800 bg-[#10182c] text-center">
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      setActiveTab('notifications');
                    }}
                    className="w-full py-1.5 px-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <span>See All Notifications ({notifications.length})</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Account / Profile Settings / Sign Out */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            {isPatient ? (
              <button
                type="button"
                onClick={onOpenProfileSettings}
                className="flex items-center gap-2 text-left rounded-xl hover:bg-slate-800/80 p-1 -m-1 transition cursor-pointer group"
                title="Click to view & edit Profile Settings"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-teal-950 text-cyan-300 font-bold text-[10px] flex items-center justify-center border border-cyan-500/40 shadow-xs group-hover:border-cyan-400 transition">
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                  ) : (
                    initials || <User className="w-4 h-4" />
                  )}
                </div>
                <div className="hidden xl:block text-left">
                  <p className="text-xs font-semibold text-white leading-tight group-hover:text-cyan-300 transition-colors">
                    {currentUser.name}
                  </p>
                  <p className="text-[10px] text-cyan-400 leading-tight font-medium">
                    {t.nav.profileSettings}
                  </p>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500/20 to-cyan-500/20 text-cyan-300 font-bold text-[10px] flex items-center justify-center border border-cyan-500/40 shadow-xs"
                  title={currentUser.name}
                >
                  {initials || <User className="w-4 h-4" />}
                </div>
                <div className="hidden xl:block text-left">
                  <p className="text-xs font-semibold text-white leading-tight">{currentUser.name}</p>
                  <p className="text-[10px] text-cyan-400/90 leading-tight capitalize">
                    {currentUser.department || t.roles[activeRole] || activeRole}
                  </p>
                </div>
              </div>
            )}
            <button
              onClick={() => {
                setShowNotifications(false);
                logout('login');
              }}
              className="ml-1 p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition flex items-center gap-1 cursor-pointer"
              title={t.nav.signOut}
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-[11px] font-semibold text-slate-300 hidden md:inline">{t.nav.signOut}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Centered Popup Modal */}
      {selectedNotifModal && (
        <NotificationDetailModal
          notification={selectedNotifModal}
          onClose={() => setSelectedNotifModal(null)}
          onMarkAsRead={(id) => {
            markNotificationAsRead(id);
            setSelectedNotifModal((prev) => (prev ? { ...prev, read: true } : null));
          }}
        />
      )}
    </header>
  );
};

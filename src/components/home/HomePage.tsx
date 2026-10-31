import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { SmartClinicLogo } from '../common/SmartClinicLogo';
import { PrivacyPolicyModal } from '../auth/PrivacyPolicyModal';
import {
  Calendar,
  Clock,
  Stethoscope,
  Activity,
  FileText,
  Pill,
  Microscope,
  ShieldCheck,
  ArrowRight,
  Phone,
  MapPin,
  Building2,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Lock,
  HeartPulse,
  UserCheck,
  Award,
  Users,
  Search,
  LogIn,
  Hospital,
  BadgeCheck,
  Menu,
  X,
} from 'lucide-react';
import { INITIAL_USERS } from '../../data/mockData';
import { getDoctorSchedule } from '../../utils/doctorSchedules';

interface HomePageProps {
  onOpenBookAppointment?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenBookAppointment }) => {
  const { setActiveTab, appointments, isAuthenticated, currentUser, setPendingAction, users, t } = useClinic();
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const doctors = (users && users.length > 0 ? users : INITIAL_USERS).filter((u) => u.role === 'doctor');
  
  // Real-time queue calculations synced directly with clinic core
  const activeInConsult = appointments.filter((a) => a.status === 'In Consultation' || a.status === 'Called').length;
  const waitingInQueue = appointments.filter((a) => a.status === 'Checked In').length;
  const scheduledUpcoming = appointments.filter((a) => a.status === 'Scheduled' || a.status === 'Confirmed').length;
  const totalToday = appointments.filter((a) => a.status !== 'Cancelled').length;
  const avgWaitMinutes = Math.max(6, waitingInQueue * 8 + (activeInConsult > 0 ? 4 : 0));

  // Live queue snapshot: In Consultation & Called first, then Checked In, then upcoming
  const liveQueueSnapshot = [...appointments]
    .filter((a) => a.status !== 'Cancelled')
    .sort((a, b) => {
      const order: Record<string, number> = {
        'In Consultation': 1,
        'Called': 2,
        'Checked In': 3,
        'Scheduled': 4,
        'Confirmed': 5,
        'Completed': 6,
      };
      const diff = (order[a.status] || 99) - (order[b.status] || 99);
      if (diff !== 0) return diff;
      return (a.time || '').localeCompare(b.time || '');
    })
    .slice(0, 3);

  const handleViewLiveQueue = () => {
    if (!isAuthenticated) {
      setPendingAction('queue');
      setActiveTab('login');
    } else {
      setActiveTab('queue');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Banner / Announcement */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-cyan-700 text-white text-xs py-2 px-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center sm:text-left">
          <div className="flex items-center gap-2.5 font-medium flex-wrap justify-center sm:justify-start">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-white/95 text-[10px] font-bold tracking-wider uppercase border border-white/20 shadow-2xs backdrop-blur-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
              {t.common.status}
            </span>
            <span className="text-white/95 text-[11px] sm:text-xs">
              {t.home.bannerNotice} <span className="opacity-60 mx-1">•</span>{' '}
              <button
                type="button"
                onClick={() => setShowPrivacyModal(true)}
                className="inline-flex items-center gap-1 font-semibold text-white hover:text-teal-100 transition cursor-pointer hover:underline decoration-teal-200/60"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-teal-200 inline" />
                <span>{t.common.privacyCertified}</span>
              </button>
            </span>
          </div>
          <div className="flex items-center gap-3.5 text-[11px] text-white/90 shrink-0">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-teal-200" />
              <span>{t.common.open24Hours}</span>
            </span>
            <span className="hidden md:inline opacity-40">|</span>
            <span className="flex items-center gap-1.5 font-medium">
              <Phone className="w-3.5 h-3.5 text-teal-200" />
              <span>{t.common.emergencyHotline}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SmartClinicLogo className="w-10 h-10" glow={true} />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-teal-700 to-cyan-600 dark:from-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
                  Smart Clinic
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-semibold">
                Outpatient & Clinical Management
              </p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-6 xl:gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#services" className="hover:text-teal-600 dark:hover:text-teal-400 transition">Services</a>
            <a href="#specialties" className="hover:text-teal-600 dark:hover:text-teal-400 transition">Clinical Specialties</a>
            <a href="#portals" className="hover:text-teal-600 dark:hover:text-teal-400 transition">Clinic Portals</a>
            <a href="#standards" className="hover:text-teal-600 dark:hover:text-teal-400 transition">Security & Scope</a>
            <button
              type="button"
              onClick={() => setShowPrivacyModal(true)}
              className="hover:text-teal-600 dark:hover:text-teal-400 transition cursor-pointer font-medium"
            >
              Privacy Notice
            </button>
          </nav>

          <div className="flex items-center gap-2.5">
            {isAuthenticated ? (
              <button
                onClick={() => setActiveTab('dashboard')}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-lg shadow-sm transition cursor-pointer whitespace-nowrap"
              >
                <span>{t.nav.dashboard}</span>
                <span className="text-xs font-normal opacity-90 capitalize">({currentUser.role})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab('login')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer whitespace-nowrap"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{t.nav.signIn}</span>
                </button>
                <button
                  onClick={onOpenBookAppointment}
                  className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-lg shadow-sm hover:shadow transition cursor-pointer whitespace-nowrap"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.common.bookAppointment}</span>
                  <span className="sm:hidden">Book</span>
                </button>
              </>
            )}

            {/* Mobile Nav Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {/* Outpatient Non-Emergency Scope Notice */}
        <div className="bg-amber-50/90 dark:bg-amber-950/35 border-t border-amber-200/80 dark:border-amber-800/50 py-1.5 px-4 text-center text-[11px] text-amber-900 dark:text-amber-200">
          <strong>Outpatient Non-Emergency Care Only:</strong> SmartClinic manages scheduled and walk-in outpatient consultations. For urgent or life-threatening medical emergencies, call <strong>911</strong> or go to the nearest hospital Emergency Room.
        </div>

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3 space-y-1.5 text-sm font-medium">
            <a
              href="#services"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-teal-600 dark:hover:text-teal-400 transition"
            >
              Services
            </a>
            <a
              href="#specialties"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-teal-600 dark:hover:text-teal-400 transition"
            >
              Clinical Specialties
            </a>
            <a
              href="#portals"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-teal-600 dark:hover:text-teal-400 transition"
            >
              Clinic Portals
            </a>
            <a
              href="#standards"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-teal-600 dark:hover:text-teal-400 transition"
            >
              Standards
            </a>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setShowPrivacyModal(true);
              }}
              className="w-full text-left block px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-teal-600 dark:hover:text-teal-400 transition cursor-pointer"
            >
              Privacy Policy
            </button>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-b from-teal-50/60 via-slate-50 to-white dark:from-slate-900/60 dark:via-slate-950 dark:to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(#0d9488_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Headlines & Action */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-100/80 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs font-semibold tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>{t.home.heroBadge}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
                {t.home.heroTitlePart1} <br />
                <span className="bg-gradient-to-r from-teal-600 to-cyan-500 bg-clip-text text-transparent">
                  {t.home.heroTitlePart2}
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                {t.home.heroSubtitle}
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <button
                  onClick={onOpenBookAppointment}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-base font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  <Calendar className="w-5 h-5" />
                  <span>{t.home.btnBookNow}</span>
                </button>
                <button
                  onClick={handleViewLiveQueue}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  <Clock className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  <span>{t.home.btnViewQueue}</span>
                </button>
              </div>

              {/* Badges / Micro Proof */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-4 text-center lg:text-left tabular-nums">
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">100%</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Digital Health Records</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">{avgWaitMinutes} min</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{t.home.avgWaitTime}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">RBAC</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{t.common.privacyCertified}</div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Status & Queue Snapshot Card */}
            <div className="lg:col-span-5">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    <div>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100 block leading-tight">{t.home.liveQueueTitle}</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                        Synced Live with Clinic EMR
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Open Now • PHT
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 my-4 tabular-nums">
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                      <span>{t.home.waitingInQueue}</span>
                      <Clock className="w-3.5 h-3.5 text-teal-600" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                      {waitingInQueue} <span className="text-xs font-normal text-slate-500">patients</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                      <span>{t.home.inConsultation}</span>
                      <Activity className="w-3.5 h-3.5 text-cyan-600" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                      {activeInConsult} <span className="text-xs font-normal text-slate-500">active</span>
                    </div>
                  </div>
                </div>

                {/* Queue Snapshot Table */}
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <span>Active Queue Snapshot</span>
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 normal-case font-medium">Privacy Protected</span>
                  </div>
                  {liveQueueSnapshot.map((apt, idx) => {
                    const ticketId = apt.queueNumber || `Q-${101 + idx}`;
                    return (
                      <div
                        key={apt.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs hover:border-teal-200 dark:hover:border-teal-800/60 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                            apt.status === 'In Consultation'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              : apt.status === 'Checked In'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800/50'
                          }`}>
                            {ticketId}
                          </span>
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <span>Ticket #{ticketId}</span>
                              {apt.status === 'In Consultation' && (
                                <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.2 rounded uppercase">
                                  {apt.room || 'Room 302'}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              {apt.department} • {apt.doctorName ? apt.doctorName.split(',')[0] : 'Attending Physician'}
                            </div>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          apt.status === 'In Consultation'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : apt.status === 'Checked In'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {apt.status}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    Total Registered Today: <strong className="text-slate-800 dark:text-slate-200">{totalToday}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleViewLiveQueue}
                    className="inline-flex items-center gap-1.5 text-teal-600 dark:text-teal-400 font-bold hover:text-teal-700 dark:hover:text-teal-300 hover:underline cursor-pointer group transition"
                    title={isAuthenticated ? 'View full live queue board' : 'Sign in required to view live queue board'}
                  >
                    {!isAuthenticated && (
                      <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    )}
                    <span>View Live Queue</span>
                    {!isAuthenticated && (
                      <span className="text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                        Login Required
                      </span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-16 md:py-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Clinical Excellence
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              Comprehensive Outpatient & Diagnostic Services
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm mt-3">
              Full-service ambulatory care equipped with computerized health records, instant diagnostics, and integrated pharmacy dispensing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-teal-500/50 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-950 flex items-center justify-center text-teal-600 dark:text-teal-400 mb-4">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Internal Medicine & Primary Care</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                Comprehensive adult evaluations, chronic illness management (diabetes, hypertension), preventive wellness, and routine medical consultations.
              </p>
              <ul className="text-xs space-y-1.5 text-slate-500 dark:text-slate-400">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-500" /> Routine Medical Checkups</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-500" /> Diabetic & Hypertensive Care</li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-teal-500/50 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-cyan-100 dark:bg-cyan-950 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-4">
                <HeartPulse className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Cardiovascular & Metabolic Care</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                Cardiac risk assessments, 12-lead ECG, blood pressure monitoring, cholesterol profiling, and cardiovascular disease prevention.
              </p>
              <ul className="text-xs space-y-1.5 text-slate-500 dark:text-slate-400">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-500" /> Resting 12-Lead ECG</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-500" /> Dyslipidemia Management</li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-teal-500/50 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
                <Microscope className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Diagnostic Pathology & Lab</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                Complete Blood Count (CBC), Fasting Blood Sugar, HbA1c, Lipid Panels, Urinalysis, and rapid diagnostic panels with direct digital delivery.
              </p>
              <ul className="text-xs space-y-1.5 text-slate-500 dark:text-slate-400">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-500" /> Rapid Digital Results</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-500" /> Direct EMR Integration</li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-teal-500/50 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4">
                <Pill className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Clinic Pharmacy & E-Prescriptions</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                Computerized physician order entry (CPOE) with instant drug-allergy and drug-interaction screening, and verified barcode dispensing.
              </p>
              <ul className="text-xs space-y-1.5 text-slate-500 dark:text-slate-400">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-500" /> QR-Verifiable E-Prescriptions</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-500" /> Automated Safety Checks</li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-teal-500/50 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Medical Certificates & Clearances</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                Fit-to-work examinations, school clearances, pre-employment checkups, and verified electronic medical certificates with anti-fraud signatures.
              </p>
              <ul className="text-xs space-y-1.5 text-slate-500 dark:text-slate-400">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-500" /> Anti-Fraud Digitally Signed</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-500" /> Fast Same-Day Issuance</li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-teal-500/50 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">PhilHealth & HMO Billing Support</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                Seamless claim processing for PhilHealth Konsulta members, Maxicare, Intellicare, Medicard, and major health maintenance organizations.
              </p>
              <ul className="text-xs space-y-1.5 text-slate-500 dark:text-slate-400">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-500" /> Instant Eligibility Verification</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-500" /> Itemized Official Receipts</li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* Clinical Specialties & Medical Staff Section (No Doctor Pictures/Assets) */}
      <section id="specialties" className="py-16 md:py-20 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Clinical Leadership & Governance
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              Board-Certified Clinical Specialties
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm mt-3">
              Outpatient specialists and clinical faculty available across Main Outpatient Clinic and Annex Satellite Clinic.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {doctors.map((doc) => {
              const docSchedule = getDoctorSchedule(doc.id, doc);
              return (
                <div
                  key={doc.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5 shadow-sm hover:shadow-md transition"
                >
                  <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800/60 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                    <Stethoscope className="w-7 h-7" />
                  </div>
                  <div className="text-left space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300">
                        {doc.department}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        <BadgeCheck className="w-3.5 h-3.5" /> Active Roster
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{doc.name}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">{doc.specialty}</p>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Demo Staff ID: {doc.licenseNumber || 'DEMO-MD'}
                    </div>
                    <div className="text-[11px] text-teal-700 dark:text-teal-300 font-semibold flex items-center gap-1.5 bg-teal-50/70 dark:bg-teal-950/40 p-2 rounded-xl border border-teal-200/60 dark:border-teal-800/50">
                      <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                      <span>{docSchedule.workDaysLabel} • {docSchedule.hoursLabel}</span>
                    </div>
                    <div className="pt-1">
                      <button
                        onClick={onOpenBookAppointment}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 hover:underline cursor-pointer"
                      >
                        <span>Book Outpatient Appointment</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Role Portals Showcase */}
      <section id="portals" className="py-16 md:py-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Role-Based Portals
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              Dedicated Workspaces for Every Role
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm mt-3">
              Secure, role-tailored interfaces ensuring confidentiality, operational efficiency, and rapid care delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Patient Portal Card */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-950 flex items-center justify-center text-teal-600 dark:text-teal-400 mb-3">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Patient Portal</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Self-service booking, digital lab reports, prescription QR codes, and personal consultation history.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('login')}
                className="mt-6 w-full py-2 px-3 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition"
              >
                Patient Access
              </button>
            </div>

            {/* Doctor Portal Card */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Physician Workspace</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Structured SOAP clinical notes, ICD diagnosis coding, lab requisitions, and instant prescription generation.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('login')}
                className="mt-6 w-full py-2 px-3 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                Physician Sign In
              </button>
            </div>

            {/* Staff / Nurse Card */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Clinical Staff & Triage</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Patient check-in, vitals measurement, live triage queue management, and pharmacy inventory handling.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('login')}
                className="mt-6 w-full py-2 px-3 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
              >
                Staff Access
              </button>
            </div>

            {/* Admin Portal Card */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 mb-3">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Administrator</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Audit logs, user access permissions, billing oversight, predictive analytics, and system synchronization.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('login')}
                className="mt-6 w-full py-2 px-3 text-xs font-semibold rounded-lg bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-900 dark:hover:bg-slate-600 transition"
              >
                Admin Sign In
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* Compliance & Standards */}
      <section id="standards" className="scroll-mt-20 py-14 bg-slate-100/70 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 relative">
        <div id="compliance" className="absolute -top-20" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 rounded-xl shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Role-Based Data Isolation</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Strict authenticated patient and clinical role boundaries safeguard synthetic outpatient records.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 rounded-xl shrink-0">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">End-to-End Audit Trail</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Every chart view, prescription write, and lab access is timestamped with user credentials.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Standard Clinical Coding</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    ICD-10 clinical diagnostic codes and international medication safety cross-referencing.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <SmartClinicLogo className="w-7 h-7" />
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Smart Clinic</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Outpatient Management & Intelligent Clinical Decision Support Platform.
              </p>
            </div>

            <div>
              <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-2.5">Operating Hours</h5>
              <p className="text-xs">Open 24 Hours • 7 Days a Week</p>
            </div>

            <div>
              <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-2.5">Service Coverage</h5>
              <p className="text-xs flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-teal-600" /> Philippines Only</p>
              <p className="text-xs mt-1">Nationwide Outpatient Telehealth & Clinic Network</p>
            </div>

            <div>
              <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-2.5">Contact</h5>
              <p className="text-xs flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-teal-600" /> Globe: +639154050623</p>
              <p className="text-xs mt-1">Email: smartclinicrealacc@gmail.com</p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
            <div>
              © {new Date().getFullYear()} Smart Clinic. All rights reserved.
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setShowPrivacyModal(true)}
                className="hover:text-teal-600 dark:hover:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer font-bold text-slate-700 dark:text-slate-300"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                <span>Patient Data Privacy Notice</span>
              </button>
              <span>•</span>
              <span>Academic Capstone Prototype</span>
              <span>•</span>
              <button
                onClick={() => setActiveTab('login')}
                className="text-teal-600 dark:text-teal-400 hover:underline font-semibold cursor-pointer"
              >
                Staff Portal
              </button>
            </div>
          </div>
        </div>
      </footer>

      <PrivacyPolicyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />
    </div>
  );
};

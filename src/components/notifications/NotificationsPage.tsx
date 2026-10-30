import React, { useState, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import {
  Bell,
  CheckCircle2,
  Calendar,
  FlaskConical,
  Pill,
  PackageCheck,
  Receipt,
  ShieldAlert,
  Activity,
  Filter,
  Check,
  Clock,
  Search,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  Inbox,
  AlertTriangle,
} from 'lucide-react';
import { SmartClinicLogo } from '../common/SmartClinicLogo';
import { NotificationDetailModal } from './NotificationDetailModal';
import type { Notification } from '../../types/clinic';

export const NotificationsPage: React.FC = () => {
  const {
    notifications,
    unreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    acknowledgeCalledAppointment,
    activeRole,
    currentUser,
    setActiveTab,
  } = useClinic();

  const [filterType, setFilterType] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const isPatient = activeRole === 'patient';
  const isAdmin = activeRole === 'admin';
  const isProvider = !isPatient && !isAdmin;

  // Filter list strictly based on UI controls
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      if (filterType === 'unread' && notif.read) return false;
      if (filterType === 'read' && !notif.read) return false;
      if (selectedCategory !== 'all' && notif.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = notif.title.toLowerCase().includes(query);
        const matchesMsg = notif.message.toLowerCase().includes(query);
        const matchesContent = notif.content?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesMsg && !matchesContent) return false;
      }
      return true;
    });
  }, [notifications, filterType, selectedCategory, searchQuery]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    notifications.forEach((n) => {
      if (n.category) set.add(n.category);
    });
    return Array.from(set);
  }, [notifications]);

  const handleOpenNotification = (notif: Notification) => {
    if (!notif.read) {
      markNotificationAsRead(notif.id);
    }
    setSelectedNotification(notif);
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'queue_call':
        return <Bell className="w-4 h-4 text-emerald-600 animate-bounce" />;
      case 'lab':
        return <FlaskConical className="w-4 h-4 text-teal-500" />;
      case 'appointment':
        return <Calendar className="w-4 h-4 text-blue-500" />;
      case 'prescription':
        return <Pill className="w-4 h-4 text-indigo-500" />;
      case 'inventory':
        return <PackageCheck className="w-4 h-4 text-amber-500" />;
      case 'billing':
        return <Receipt className="w-4 h-4 text-emerald-500" />;
      case 'triage':
        return <Activity className="w-4 h-4 text-rose-500" />;
      case 'security':
        return <ShieldAlert className="w-4 h-4 text-purple-500" />;
      default:
        return <Bell className="w-4 h-4 text-teal-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-xs font-sans pb-12 select-none">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 border border-teal-700/40">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-lg">
            <Bell className="w-7 h-7 text-teal-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 text-teal-200 border border-white/20">
                {isPatient ? 'Patient Portal' : isAdmin ? 'Administrator' : 'Clinical Provider'}
              </span>
              <span className="text-[10px] text-teal-200 font-medium">
                Role-Isolated Notifications (RA 10173)
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
              Notifications & Clinical Alerts
            </h1>
            <p className="text-teal-100/90 text-xs mt-0.5">
              Live updates filtered exclusively for your authorized account ({currentUser.name}).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
          {unreadNotificationCount > 0 && (
            <button
              onClick={markAllNotificationsAsRead}
              className="px-3.5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl font-bold flex items-center gap-2 transition shadow-md shadow-teal-500/20 cursor-pointer text-xs"
            >
              <Check className="w-4 h-4" />
              <span>Mark All Read</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('dashboard')}
            className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold flex items-center gap-1.5 border border-white/20 transition cursor-pointer text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          {/* Status Tabs */}
          <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filterType === 'all'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilterType('unread')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                filterType === 'unread'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <span>Unread</span>
              {unreadNotificationCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-teal-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadNotificationCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilterType('read')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filterType === 'read'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Read
            </button>
          </div>

          {/* Category Dropdown */}
          {categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat} className="capitalize">
                  {cat.toUpperCase()}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search authorized alerts..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
          />
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Inbox className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                No notifications found
              </p>
              <p className="text-slate-400 text-xs mt-0.5">
                {searchQuery || selectedCategory !== 'all' || filterType !== 'all'
                  ? 'Try adjusting your filters or search terms.'
                  : `You are up to date! There are no new ${activeRole} notifications.`}
              </p>
            </div>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const formattedDate = notif.createdAt || notif.timestamp
              ? new Date(notif.createdAt || notif.timestamp || '').toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Recent';

            return (
              <div
                key={notif.id}
                onClick={() => handleOpenNotification(notif)}
                className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition cursor-pointer hover:bg-teal-50/40 dark:hover:bg-slate-800/60 ${
                  !notif.read ? 'bg-teal-50/20 dark:bg-teal-950/15' : ''
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 border ${
                      !notif.read
                        ? 'bg-teal-100 dark:bg-teal-950/60 border-teal-300 dark:border-teal-800 text-teal-700 dark:text-teal-300'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    {getCategoryIcon(notif.category)}
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                        {notif.title}
                      </span>
                      {notif.category && (
                        <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {notif.category}
                        </span>
                      )}
                      {(notif.priority === 'high' || notif.priority === 'urgent') && (
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> Urgent
                        </span>
                      )}
                      {notif.acknowledgedAt && (
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Acknowledged
                        </span>
                      )}
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" title="Unread" />
                      )}
                    </div>

                    <p className="text-slate-600 dark:text-slate-400 text-xs line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="flex items-center gap-2 pt-0.5 text-[11px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-center">
                  {isPatient && notif.category === 'queue_call' && notif.relatedResourceId && !notif.acknowledgedAt && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        acknowledgeCalledAppointment(notif.relatedResourceId!);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Acknowledge</span>
                    </button>
                  )}
                  <span className="text-teal-600 dark:text-teal-400 font-semibold text-xs hidden sm:inline">
                    View
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Centered Popup Modal */}
      {selectedNotification && (
        <NotificationDetailModal
          notification={selectedNotification}
          onClose={() => setSelectedNotification(null)}
          onMarkAsRead={(id) => {
            markNotificationAsRead(id);
            setSelectedNotification((prev) => (prev ? { ...prev, read: true } : null));
          }}
        />
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { ShieldCheck, Search, Filter, Clock, User, ShieldAlert, FileText, Mail, Smartphone, RefreshCw, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from '../../lib/config';

export const AuditLogsView: React.FC = () => {
  const { auditLogs } = useClinic();
  const [activeTab, setActiveTab] = useState<'clinical' | 'communication'>('clinical');
  const [filterAction, setFilterAction] = useState('ALL');
  const [search, setSearch] = useState('');
  const [commLogs, setCommLogs] = useState<any[]>([]);
  const [loadingComm, setLoadingComm] = useState(false);
  const [channelFilter, setChannelFilter] = useState<'ALL' | 'email' | 'sms'>('ALL');

  const fetchCommLogs = async () => {
    setLoadingComm(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/communication/logs`);
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setCommLogs(data.logs);
      }
    } catch {
      // ignore
    } finally {
      setLoadingComm(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'communication') {
      fetchCommLogs();
    }
  }, [activeTab]);

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.description.toLowerCase().includes(search.toLowerCase()) ||
      log.userName.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.resourceId.toLowerCase().includes(search.toLowerCase());

    const matchesAction = filterAction === 'ALL' || log.resourceType === filterAction;
    return matchesSearch && matchesAction;
  });

  const filteredCommLogs = commLogs.filter((log) => {
    const matchesChan = channelFilter === 'ALL' || log.channel === channelFilter;
    const matchesSearch =
      (log.recipient || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.subject || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.message || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.purpose || '').toLowerCase().includes(search.toLowerCase());
    return matchesChan && matchesSearch;
  });

  const getActionBadge = (action: string) => {
    if (action.includes('VIEW')) return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    if (action.includes('CREATE') || action.includes('ENTERED')) return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    if (action.includes('DISPENSED')) return 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800';
    if (action.includes('SECURITY')) return 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
    return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  };

  return (
    <div className="space-y-4">
      {/* Header and Compliance Status */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {activeTab === 'clinical' ? 'Security & Clinical Audit Logs' : 'Email & SMS Delivery Logs'}
            </h1>
            <span className="text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>RA 10173 Audit Active</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {activeTab === 'clinical'
              ? 'HIPAA/RA 10173 compliant tamper-evident audit trail tracking all clinical access, electronic prescriptions, and modifications.'
              : 'Real-time telemetry logging of all SMTP emails and Twilio SMS verification codes, security alerts, and transactional messages.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('clinical')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'clinical'
                ? 'bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Clinical EMR Logs
          </button>
          <button
            onClick={() => setActiveTab('communication')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'communication'
                ? 'bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Email & SMS Logs</span>
          </button>
        </div>
      </div>

      {activeTab === 'clinical' ? (
        <>
          {/* Filter and Search Bar */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by action, user, patient ID, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 dark:text-slate-500 font-medium">Resource:</span>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="ALL" className="dark:bg-slate-800">All Resources</option>
                <option value="Patient" className="dark:bg-slate-800">Patient</option>
                <option value="Consultation" className="dark:bg-slate-800">Consultation</option>
                <option value="Prescription" className="dark:bg-slate-800">Prescription</option>
                <option value="Laboratory" className="dark:bg-slate-800">Laboratory</option>
                <option value="Billing" className="dark:bg-slate-800">Billing</option>
                <option value="Security" className="dark:bg-slate-800">Security</option>
              </select>
            </div>
          </div>

          {/* Audit Log Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Timestamp & IP</th>
                    <th className="py-3 px-3">Staff Member & Role</th>
                    <th className="py-3 px-3">Event Action</th>
                    <th className="py-3 px-3">Resource Target</th>
                    <th className="py-3 px-4">Audited Event Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        No audit records match the search filter.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-mono text-slate-900 dark:text-white block font-medium">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                            {new Date(log.timestamp).toLocaleDateString()} • {log.ipAddress || '127.0.0.1'}
                          </span>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-bold text-slate-900 dark:text-white block">{log.userName}</span>
                          <span className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold uppercase">
                            {log.userRole.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getActionBadge(log.action)}`}>
                            {log.action}
                          </span>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-medium text-slate-800 dark:text-slate-200">{log.resourceType}</span>
                          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 block">{log.resourceId}</span>
                        </td>

                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 leading-relaxed">
                          {log.description}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Communication Filters */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search recipient, subject, or message content..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 dark:text-slate-500 font-medium">Channel:</span>
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value as any)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="ALL" className="dark:bg-slate-800">All Channels</option>
                <option value="email" className="dark:bg-slate-800">Email (SMTP)</option>
                <option value="sms" className="dark:bg-slate-800">SMS (Twilio)</option>
              </select>

              <button
                type="button"
                onClick={fetchCommLogs}
                disabled={loadingComm}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                title="Refresh Logs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingComm ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Communication Log Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-3">Channel</th>
                    <th className="py-3 px-3">Recipient</th>
                    <th className="py-3 px-3">Purpose</th>
                    <th className="py-3 px-3">Delivery Status</th>
                    <th className="py-3 px-4">Subject / Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredCommLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        {loadingComm ? 'Loading communication telemetry…' : 'No Email or SMS messages logged yet.'}
                      </td>
                    </tr>
                  ) : (
                    filteredCommLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-700 dark:text-slate-300">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          <span className="block text-[10px] text-slate-400 dark:text-slate-500">
                            {new Date(log.timestamp).toLocaleDateString()}
                          </span>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          {log.channel === 'email' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 font-bold text-[10px]">
                              <Mail className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                              SMTP Email
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 font-bold text-[10px]">
                              <Smartphone className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                              Twilio SMS
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 font-mono text-slate-900 dark:text-white font-bold">
                          {log.recipient}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold uppercase">
                            {log.purpose.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          {log.status === 'sent' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-[10px]">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              Live Dispatched
                            </span>
                          ) : log.status === 'simulated' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold text-[10px]">
                              Local Simulated
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-[10px]">
                              Failed
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {log.channel === 'email' ? log.subject : log.message}
                          {(log.messageId || log.sid) && (
                            <span className="block text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                              ID: {log.messageId || log.sid}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

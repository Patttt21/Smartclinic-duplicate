import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import {
  Database,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  X,
  Server,
  ShieldCheck,
  Layers,
  KeyRound,
  Trash2,
  Code2,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import {
  getSupabaseUrl,
  getSupabaseAnonKey,
  setSupabaseCredentials,
  clearSupabaseCredentials,
  testSupabaseConnection,
  SUPABASE_SQL_SCHEMA,
  SUPABASE_GRANT_SQL,
} from '../../lib/supabase';

interface Props {
  onClose: () => void;
}

export const SupabaseModal: React.FC<Props> = ({ onClose }) => {
  const { supabaseInfo, syncAllToSupabase, refreshSupabaseConfig } = useClinic();
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [copiedGrants, setCopiedGrants] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSqlViewer, setShowSqlViewer] = useState(false);

  // Form state
  const [inputUrl, setInputUrl] = useState(getSupabaseUrl() || '');
  const [inputKey, setInputKey] = useState(getSupabaseAnonKey() || '');
  const [connectMessage, setConnectMessage] = useState<{
    type: 'success' | 'error' | 'warning';
    text: string;
  } | null>(null);

  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    syncedCounts: Record<string, number>;
    message: string;
  } | null>(null);

  const handleCopyFullSchema = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
      setCopiedSchema(true);
      setTimeout(() => setCopiedSchema(false), 3000);
    } catch {
      // Fallback
      setCopiedSchema(true);
      setTimeout(() => setCopiedSchema(false), 3000);
    }
  };

  const handleCopyGrants = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_GRANT_SQL);
      setCopiedGrants(true);
      setTimeout(() => setCopiedGrants(false), 3000);
    } catch {
      // Fallback
      setCopiedGrants(true);
      setTimeout(() => setCopiedGrants(false), 3000);
    }
  };

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim() || !inputKey.trim()) {
      setConnectMessage({
        type: 'error',
        text: 'Please provide both your Supabase Project URL and Anon Public Key.'
      });
      return;
    }

    setTesting(true);
    setConnectMessage(null);

    try {
      const res = await testSupabaseConnection(inputUrl.trim(), inputKey.trim());
      if (res.success) {
        setSupabaseCredentials(inputUrl.trim(), inputKey.trim());
        refreshSupabaseConfig();

        if (res.needsGrants) {
          setConnectMessage({
            type: 'warning',
            text: 'Connected to Supabase project! Database tables exist, but PostgREST permissions need granting. Click "Copy Grants SQL" below and run it in your Supabase SQL Editor.'
          });
        } else if (res.tablesFound === false) {
          setConnectMessage({
            type: 'warning',
            text: 'Connected to Supabase project! However, database tables have not been created yet. Copy and run the SQL schema below in your Supabase SQL Editor.'
          });
        } else {
          setConnectMessage({
            type: 'success',
            text: 'Connection verified! Your Smart Clinic is now connected to live Supabase PostgreSQL.'
          });
        }
      } else {
        setConnectMessage({
          type: 'error',
          text: res.message
        });
      }
    } catch (err: any) {
      setConnectMessage({
        type: 'error',
        text: err?.message || 'Failed to connect to Supabase.'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = () => {
    clearSupabaseCredentials();
    refreshSupabaseConfig();
    setInputUrl('');
    setInputKey('');
    setConnectMessage({
      type: 'warning',
      text: 'Supabase credentials cleared. Smart Clinic is now running in local responsive mode.'
    });
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const res = await syncAllToSupabase();
      setSyncResult(res);
    } catch (err: any) {
      setSyncResult({
        success: false,
        syncedCounts: {},
        message: err?.message || 'Sync encountered an error',
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Supabase PostgreSQL Backend Hub
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  Native Database
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Persistent relational storage, RLS security, and real-time clinic sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Status Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Supabase Status Card */}
            <div
              className={`p-4 rounded-xl border ${
                supabaseInfo.isConfigured
                  ? 'bg-emerald-50/50 border-emerald-200'
                  : 'bg-amber-50/40 border-amber-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Database
                    className={`w-4 h-4 ${
                      supabaseInfo.isConfigured ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  />
                  <span className="font-bold text-xs text-slate-800">Supabase Connection</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    supabaseInfo.isConfigured
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {supabaseInfo.isConfigured ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" /> Live Connected
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3" /> Standby (Local Mode)
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {supabaseInfo.isConfigured
                  ? `Connected to Supabase project host: ${supabaseInfo.domain}`
                  : 'Operating in local memory mode. Enter your Supabase credentials below to connect your cloud PostgreSQL database.'}
              </p>
            </div>

            {/* Vercel & Production Readiness */}
            <div className="p-4 rounded-xl border bg-slate-50 border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-sky-600" />
                  <span className="font-bold text-xs text-slate-800">PostgreSQL Schema Status</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 flex items-center gap-1">
                  8 Tables Ready
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Full schema prepared at <code className="text-slate-800 font-mono text-[11px]">/supabase/schema.sql</code> with UUIDs, RLS policies, and healthcare indices.
              </p>
            </div>
          </div>

          {/* Interactive Supabase Credentials Setup */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-slate-800">
                  {supabaseInfo.isConfigured ? 'Update Supabase Credentials' : 'Connect Your Supabase Project'}
                </h4>
              </div>
              {supabaseInfo.isConfigured && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="text-[11px] text-rose-600 hover:text-rose-700 flex items-center gap-1 font-medium cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Disconnect
                </button>
              )}
            </div>

            <form onSubmit={handleTestAndSave} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  placeholder="https://xyzabcdefghijkl.supabase.co"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Supabase Anon Public Key
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-500">
                  Found under Supabase ➔ Project Settings ➔ API
                </span>
                <button
                  type="submit"
                  disabled={testing}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition flex items-center gap-1.5 shadow-sm shadow-emerald-700/20 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                  <span>{testing ? 'Testing Connection...' : 'Connect & Test'}</span>
                </button>
              </div>
            </form>

            {connectMessage && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                  connectMessage.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : connectMessage.type === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {connectMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="text-[11px] leading-relaxed">{connectMessage.text}</div>
              </div>
            )}
          </div>

          {/* Sync Action Area */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-slate-800">Synchronize Clinic Data to Cloud</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Push all current patients, appointments, prescriptions, labs, inventory & billing statements to Supabase tables.
              </p>
            </div>
            <button
              onClick={handleSyncNow}
              disabled={syncing || !supabaseInfo.isConfigured}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:bg-slate-400 rounded-lg transition flex items-center gap-1.5 shadow-sm shadow-teal-700/20 shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'Sync All to Supabase'}</span>
            </button>
          </div>

          {/* Sync Result Feedback */}
          {syncResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs ${
                syncResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <div className="font-semibold flex items-center gap-1.5">
                {syncResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {syncResult.message}
              </div>
              {syncResult.success && syncResult.syncedCounts && (
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-emerald-700 font-medium">
                  <div>Patients: {syncResult.syncedCounts.patients || 0}</div>
                  <div>Appointments: {syncResult.syncedCounts.appointments || 0}</div>
                  <div>Prescriptions: {syncResult.syncedCounts.prescriptions || 0}</div>
                  <div>Lab Orders: {syncResult.syncedCounts.labOrders || 0}</div>
                  <div>Inventory: {syncResult.syncedCounts.inventory || 0}</div>
                  <div>Invoices: {syncResult.syncedCounts.invoices || 0}</div>
                  <div>Consultations: {syncResult.syncedCounts.consultations || 0}</div>
                  <div>Audit Logs: {syncResult.syncedCounts.auditLogs || 0}</div>
                </div>
              )}
            </div>
          )}

          {/* Table Schema Breakdown & 1-Click Copy */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                Integrated Supabase PostgreSQL Tables (8)
              </h4>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                <button
                  type="button"
                  onClick={() => setShowSqlViewer(!showSqlViewer)}
                  className="text-[11px] text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 cursor-pointer mr-1"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>{showSqlViewer ? 'Hide SQL' : 'Preview SQL'}</span>
                  {showSqlViewer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  onClick={handleCopyGrants}
                  title="Copy the 7-line GRANT query to fix PostgREST 42501 permission denied"
                  className="px-2 py-1 text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-md font-semibold flex items-center gap-1 cursor-pointer transition"
                >
                  {copiedGrants ? <Check className="w-3.5 h-3.5 text-amber-600" /> : <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />}
                  <span>{copiedGrants ? 'Grants Copied!' : 'Copy Grants SQL (Fix 42501)'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyFullSchema}
                  className="px-2 py-1 text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md font-semibold flex items-center gap-1 cursor-pointer transition"
                >
                  {copiedSchema ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSchema ? 'SQL Copied!' : 'Copy Full SQL (222 lines)'}</span>
                </button>
              </div>
            </div>

            {/* Collapsible SQL preview */}
            {showSqlViewer && (
              <div className="mb-3 p-3 bg-slate-900 rounded-xl text-slate-200 font-mono text-[11px] max-h-48 overflow-y-auto border border-slate-800">
                <pre>{SUPABASE_SQL_SCHEMA}</pre>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { name: 'patients', desc: 'Demographics, vitals & conditions' },
                { name: 'appointments', desc: 'Outpatient visits & queue' },
                { name: 'consultations', desc: 'SOAP notes & diagnoses' },
                { name: 'prescriptions', desc: 'E-prescribing & dispensing' },
                { name: 'lab_orders', desc: 'Pathology & AI analysis' },
                { name: 'inventory_items', desc: 'Pharmacy & stock levels' },
                { name: 'invoices', desc: 'Billing, taxes & payments' },
                { name: 'audit_logs', desc: 'RA 10173 tamper-evident logs' },
              ].map((table) => (
                <div key={table.name} className="p-2.5 rounded-lg border border-slate-200 bg-white">
                  <div className="font-mono font-semibold text-[11px] text-emerald-700">
                    {table.name}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                    {table.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Guide */}
          <div className="p-4 rounded-xl bg-slate-900 text-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                How to Complete Supabase Setup
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                2 Minutes
              </span>
            </div>
            <ol className="text-xs text-slate-400 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>
                Click <strong className="text-emerald-400">"Copy Full SQL"</strong> above.
              </li>
              <li>
                Open your <strong className="text-slate-200">Supabase Dashboard</strong> ➔ <strong className="text-slate-200">SQL Editor</strong>, paste, and click <strong className="text-emerald-400">Run</strong>.
              </li>
              <li>
                Copy your <strong className="text-slate-200">Project URL</strong> and <strong className="text-slate-200">anon key</strong> from Supabase Project Settings ➔ API.
              </li>
              <li>
                Paste them into the connect form above and click <strong className="text-emerald-400">"Connect & Test"</strong> (or paste them to your <code className="text-sky-300">.env</code> file).
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Row Level Security (RLS) & Philippine RA 10173 compliance</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

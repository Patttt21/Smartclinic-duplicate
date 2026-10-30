import React, { useEffect, useState } from 'react';
import { AlertTriangle, Database, X } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';

interface DemoModeBannerProps {
  isAdmin?: boolean;
  onOpenSupabaseModal?: () => void;
}

export const DemoModeBanner: React.FC<DemoModeBannerProps> = ({
  isAdmin = false,
  onOpenSupabaseModal,
}) => {
  const [configured, setConfigured] = useState<boolean>(() => isSupabaseConfigured());
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    const checkStatus = () => setConfigured(isSupabaseConfigured());
    checkStatus();
    const interval = window.setInterval(checkStatus, 2500);
    window.addEventListener('storage', checkStatus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', checkStatus);
    };
  }, []);

  if (configured || dismissed) {
    return null;
  }

  return (
    <div
      data-print-hide="true"
      className="no-print bg-amber-950/95 border-b border-amber-500/40 text-amber-100 px-3 sm:px-5 py-2 text-xs flex flex-wrap items-center justify-between gap-2 z-40"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-200 font-bold uppercase tracking-wide text-[10px] shrink-0">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          Demo Mode · Non-Persistent
        </span>
        <span className="text-[11px] text-amber-100/90 leading-snug">
          SmartClinic V2 is running on temporary synthetic mock data because a separate V2 Supabase database is not yet configured. Simulated edits stay in memory only and reset when the server restarts (cloud PostgreSQL sync, Storage uploads, and live SMTP/Twilio delivery are unavailable until configured).
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-auto">
        {isAdmin && onOpenSupabaseModal && (
          <button
            type="button"
            onClick={onOpenSupabaseModal}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px] transition cursor-pointer"
          >
            <Database className="w-3 h-3" />
            Connect V2 Supabase
          </button>
        )}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Hide Demo Mode notice for this view"
          className="p-1 text-amber-300 hover:text-white rounded-md transition cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

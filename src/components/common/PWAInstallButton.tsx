import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowGuideModal(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label="Install SmartClinic Mobile App"
        className={
          compact
            ? 'inline-flex items-center gap-1.5 rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 transition'
            : 'inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 transition'
        }
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>{isIOS ? 'Install on iOS' : 'Install App'}</span>
      </button>

      {showGuideModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-guide-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="pwa-install-guide-title" className="text-base font-bold text-slate-900 dark:text-white">
                    Install SmartClinic App (PWA)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Receive instant queue call alerts on your phone
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                aria-label="Close install instructions"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300 list-decimal list-inside">
                <li>
                  Tap the <strong>Share</strong> icon in your Safari toolbar.
                </li>
                <li>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </li>
                <li>
                  Open SmartClinic from your Home Screen and enable <strong>Queue Push Alerts</strong>.
                </li>
              </ol>
            ) : (
              <div className="mt-4 space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
                <p>
                  To install SmartClinic as a standalone app on Android, Chrome, or Edge:
                </p>
                <ol className="space-y-1.5 list-decimal list-inside text-xs text-slate-600 dark:text-slate-400">
                  <li>Open SmartClinic in a full browser tab (outside embedded preview frames if applicable).</li>
                  <li>
                    Click the browser address bar <strong>Install SmartClinic</strong> icon or menu{' '}
                    <strong>Add to Home screen / Install app</strong>.
                  </li>
                  <li>Allow notifications in your Patient Portal to receive mobile alerts when staff calls your ticket.</li>
                </ol>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="mt-5 w-full rounded-xl bg-slate-900 dark:bg-slate-800 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};

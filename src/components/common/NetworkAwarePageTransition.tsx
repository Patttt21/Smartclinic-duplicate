import React, { useState, useEffect, useRef } from 'react';
import { SmartClinicLogo } from './SmartClinicLogo';
import { Wifi, WifiOff, Zap, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';

export interface NetworkStatus {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  downlink: number; // in Mbps
  rtt: number; // in ms
  saveData: boolean;
  quality: 'fast' | 'moderate' | 'slow';
}

interface Props {
  isNavigating: boolean;
  destinationTitle: string;
  onTransitionComplete?: () => void;
}

export const NetworkAwarePageTransition: React.FC<Props> = ({
  isNavigating,
  destinationTitle,
  onTransitionComplete,
}) => {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [networkInfo, setNetworkInfo] = useState<NetworkStatus>({
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    saveData: false,
    quality: 'fast',
  });

  const animFrameRef = useRef<number | null>(null);

  // 1. Detect Network Information API and calculate connection quality
  useEffect(() => {
    const detectNetwork = () => {
      const nav = navigator as any;
      const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

      if (conn) {
        const effectiveType = conn.effectiveType || '4g';
        const downlink = typeof conn.downlink === 'number' ? conn.downlink : 10;
        const rtt = typeof conn.rtt === 'number' ? conn.rtt : 50;
        const saveData = Boolean(conn.saveData);

        let quality: 'fast' | 'moderate' | 'slow' = 'fast';
        if (effectiveType === 'slow-2g' || effectiveType === '2g' || downlink < 1.5 || rtt > 300) {
          quality = 'slow';
        } else if (effectiveType === '3g' || downlink < 5 || rtt > 150) {
          quality = 'moderate';
        }

        setNetworkInfo({
          effectiveType,
          downlink,
          rtt,
          saveData,
          quality,
        });
      } else {
        // Fallback for browsers without Network Information API
        setNetworkInfo({
          effectiveType: '4g',
          downlink: 12,
          rtt: 40,
          saveData: false,
          quality: 'fast',
        });
      }
    };

    detectNetwork();

    const nav = navigator as any;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (conn && conn.addEventListener) {
      conn.addEventListener('change', detectNetwork);
      return () => conn.removeEventListener('change', detectNetwork);
    }
  }, []);

  // 2. Drive the network-aware progress and duration
  useEffect(() => {
    if (!isNavigating) {
      if (visible) {
        // Complete smoothly to 100% then fade out
        setProgress(100);
        const timer = setTimeout(() => {
          setVisible(false);
          setProgress(0);
          onTransitionComplete?.();
        }, 220);
        return () => clearTimeout(timer);
      }
      return;
    }

    setVisible(true);
    setProgress(15);

    // Dynamic duration based on network connection quality:
    // Fast (4G / > 5 Mbps): ~380ms
    // Moderate (3G / 1.5 - 5 Mbps): ~750ms
    // Slow (2G / < 1.5 Mbps): ~1400ms
    const targetDuration =
      networkInfo.quality === 'fast'
        ? 380
        : networkInfo.quality === 'moderate'
        ? 750
        : 1400;

    const startTime = performance.now();

    const updateStep = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const pct = Math.min((elapsed / targetDuration) * 92, 92);
      setProgress((prev) => Math.max(prev, Math.round(pct)));

      if (elapsed < targetDuration) {
        animFrameRef.current = requestAnimationFrame(updateStep);
      }
    };

    animFrameRef.current = requestAnimationFrame(updateStep);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isNavigating, networkInfo.quality, onTransitionComplete, visible]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md transition-opacity duration-200 select-none ${
        progress >= 100 ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-live="polite"
      role="status"
    >
      {/* Background Soft Glow Radial */}
      <div className="absolute w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none animate-pulse" />

      {/* Main Loader Card */}
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full mx-4 px-6 py-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl text-center">
        {/* Pulsing Outer Shield Ring */}
        <div className="relative mb-5 flex items-center justify-center">
          {/* Animated Spinning Gradient Ring */}
          <div
            className={`absolute -inset-3.5 rounded-full border-2 border-transparent border-t-cyan-400 border-r-teal-500 border-b-transparent border-l-cyan-300 opacity-80 ${
              networkInfo.quality === 'fast'
                ? 'animate-spin'
                : networkInfo.quality === 'moderate'
                ? 'animate-spin duration-1000'
                : 'animate-spin duration-2000'
            }`}
          />

          {/* Secondary Counter-Rotating Dash Ring */}
          <div className="absolute -inset-2 rounded-full border border-dashed border-teal-500/40 animate-pulse" />

          {/* New Smart Clinic Logo */}
          <div className="w-20 h-20 relative p-1.5 bg-slate-950 rounded-2xl border border-slate-700/80 shadow-lg shadow-cyan-950/40 flex items-center justify-center">
            <SmartClinicLogo className="w-full h-full" glow={true} />
          </div>
        </div>

        {/* Brand & Loading Target */}
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5">
            <h2 className="text-base font-extrabold text-white tracking-tight">Smart Clinic</h2>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <p className="text-xs font-medium text-cyan-300 flex items-center justify-center gap-1.5">
            <Activity className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span>Loading {destinationTitle}...</span>
          </p>
        </div>

        {/* Progress Bar with Gradient */}
        <div className="w-full mt-5 space-y-1.5">
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden p-0.5 border border-slate-700/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-150 ease-out shadow-xs shadow-cyan-400/50"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Resolving view</span>
            <span className="font-bold text-cyan-300">{progress}%</span>
          </div>
        </div>

        {/* Network-Aware Telemetry Pill */}
        <div className="mt-5 w-full pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-300">
            {networkInfo.quality === 'fast' ? (
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
            ) : networkInfo.quality === 'moderate' ? (
              <Wifi className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span className="font-semibold capitalize">
              {networkInfo.quality === 'fast'
                ? 'High-Speed (4G)'
                : networkInfo.quality === 'moderate'
                ? 'Standard (3G)'
                : 'Slow Network'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px]">
            <span>{networkInfo.downlink.toFixed(1)} Mbps</span>
            <span>•</span>
            <span>{networkInfo.rtt}ms RTT</span>
          </div>
        </div>

        {/* Slow Network Help Notice */}
        {networkInfo.quality === 'slow' && (
          <p className="mt-2 text-[10px] text-amber-300/90 leading-tight">
            ⚠️ Low bandwidth detected. Compressing records and clinical assets for optimal speed.
          </p>
        )}
      </div>
    </div>
  );
};

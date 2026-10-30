import React, { useState, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Calendar,
  Building2,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Info,
  BarChart3,
  ShieldAlert,
  Layers,
  Clock,
  FileSpreadsheet,
} from 'lucide-react';
import { useClinic } from '../../context/ClinicContext';
import { API_BASE_URL } from '../../lib/config';
import {
  getHistoricalSyntheticDataset,
  SYNTHETIC_DATA_DISCLAIMER,
} from '../../data/historicalSyntheticData';
import {
  generatePredictiveAnalyticsReport,
  type CompletePredictiveAnalyticsReport,
  type ForecastBranchFilter,
} from '../../utils/monthlyForecasting';
import { formatManilaDateTime, formatYearMonthLabel } from '../../utils/manilaTime';

export const PredictiveAnalyticsDashboard: React.FC = () => {
  const { allClinicAppointments, consultations, users, authToken, activeRole } = useClinic();

  const [branchFilter, setBranchFilter] = useState<ForecastBranchFilter>('ALL');
  const [horizonMonths, setHorizonMonths] = useState<3 | 6>(6);
  const [refreshCounter, setRefreshCounter] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [serverReport, setServerReport] = useState<CompletePredictiveAnalyticsReport | null>(null);
  const [showHistoricalTable, setShowHistoricalTable] = useState<boolean>(false);

  const syntheticDataset = useMemo(() => getHistoricalSyntheticDataset(), []);

  // Merge synthetic 30-month historical dataset with live clinic records up to 2026-10
  const localReport = useMemo<CompletePredictiveAnalyticsReport>(() => {
    const mergedAppointments = [
      ...syntheticDataset.appointments,
      ...allClinicAppointments.filter((a) => !a.isSynthetic),
    ];
    const mergedConsultations = [
      ...syntheticDataset.consultations,
      ...consultations.filter((c) => !c.isSynthetic),
    ];
    // Reference refreshCounter so manual Refresh Forecast always recomputes a fresh timestamp & pass
    void refreshCounter;
    return generatePredictiveAnalyticsReport({
      appointments: mergedAppointments,
      consultations: mergedConsultations,
      users,
      branchFilter,
      horizonMonths,
      maxHistoricalYearMonth: '2026-10',
    });
  }, [
    syntheticDataset,
    allClinicAppointments,
    consultations,
    users,
    branchFilter,
    horizonMonths,
    refreshCounter,
  ]);

  const activeReport =
    serverReport &&
    serverReport.branchFilter === branchFilter &&
    serverReport.horizonMonths === horizonMonths
      ? serverReport
      : localReport;

  const handleRefreshForecast = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const params = new URLSearchParams({
        branch: branchFilter,
        horizon: String(horizonMonths),
      });
      const res = await fetch(`${API_BASE_URL}/api/analytics/monthly-forecast?${params.toString()}`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.report) {
          setServerReport(json.report);
        }
      }
    } catch {
      // Deterministic client-side statistical engine remains authoritative if offline
      setServerReport(null);
    } finally {
      setRefreshCounter((c) => c + 1);
      setIsRefreshing(false);
    }
  }, [branchFilter, horizonMonths, authToken]);

  if (activeRole !== 'admin') {
    return (
      <div className="max-w-3xl mx-auto p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
        <ShieldAlert className="w-8 h-8 text-rose-500 mx-auto" />
        <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
          Administrator Access Required
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Monthly Patient Volume & Health Consultation Forecasting is restricted to System Administrators.
        </p>
      </div>
    );
  }

  const latestHistorical =
    activeReport.historicalVolume[activeReport.historicalVolume.length - 1] || null;
  const nextMonthForecast = activeReport.volumeForecast[0] || null;
  const totalHorizonVisits = activeReport.volumeForecast.reduce(
    (sum, p) => sum + p.predictedCompletedVisits,
    0
  );
  const historicalAvgVisits =
    activeReport.historicalVolume.length > 0
      ? Math.round(
          activeReport.historicalVolume.reduce((s, h) => s + h.completedVisits, 0) /
            activeReport.historicalVolume.length
        )
      : 0;
  const peakForecastMonth =
    [...activeReport.volumeForecast].sort(
      (a, b) => b.predictedCompletedVisits - a.predictedCompletedVisits
    )[0] || null;

  // Build SVG coordinates for the last 18 historical months + H forecast months
  const recentHistoryForChart = activeReport.historicalVolume.slice(-18);
  const chartPointsCount = recentHistoryForChart.length + activeReport.volumeForecast.length;
  const allChartValues = [
    ...recentHistoryForChart.map((h) => h.completedVisits),
    ...recentHistoryForChart.map((h) => h.scheduledAppointments),
    ...activeReport.volumeForecast.map((f) => f.upperBound),
    ...activeReport.volumeForecast.map((f) => f.lowerBound),
  ];
  const chartMaxY = Math.max(40, Math.ceil((Math.max(...allChartValues, 10) * 1.15) / 10) * 10);
  const svgW = 860;
  const svgH = 260;
  const padL = 46;
  const padR = 24;
  const padT = 20;
  const padB = 42;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const getX = (idx: number) =>
    chartPointsCount <= 1 ? padL : padL + (idx / (chartPointsCount - 1)) * plotW;
  const getY = (val: number) => padT + plotH - (Math.max(0, val) / chartMaxY) * plotH;

  const histCompletedPath = recentHistoryForChart
    .map((h, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(h.completedVisits).toFixed(1)}`)
    .join(' ');

  const histScheduledPath = recentHistoryForChart
    .map(
      (h, i) =>
        `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(h.scheduledAppointments).toFixed(1)}`
    )
    .join(' ');

  const lastHistIdx = recentHistoryForChart.length - 1;
  const lastHistVal = recentHistoryForChart[lastHistIdx]?.completedVisits ?? 0;

  const forecastLinePoints = [
    ...(lastHistIdx >= 0 ? [{ x: getX(lastHistIdx), y: getY(lastHistVal) }] : []),
    ...activeReport.volumeForecast.map((f, idx) => ({
      x: getX(recentHistoryForChart.length + idx),
      y: getY(f.predictedCompletedVisits),
    })),
  ];
  const forecastPath = forecastLinePoints
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(' ');

  // Confidence band polygon across forecast horizon (anchored at last historical point)
  const bandPolygonPoints =
    activeReport.volumeForecast.length > 0 && lastHistIdx >= 0
      ? [
          `${getX(lastHistIdx).toFixed(1)},${getY(lastHistVal).toFixed(1)}`,
          ...activeReport.volumeForecast.map(
            (f, idx) =>
              `${getX(recentHistoryForChart.length + idx).toFixed(1)},${getY(f.upperBound).toFixed(1)}`
          ),
          ...[...activeReport.volumeForecast]
            .reverse()
            .map((f, revIdx) => {
              const origIdx = activeReport.volumeForecast.length - 1 - revIdx;
              return `${getX(recentHistoryForChart.length + origIdx).toFixed(1)},${getY(
                f.lowerBound
              ).toFixed(1)}`;
            }),
        ].join(' ')
      : '';

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 text-xs font-sans">
      {/* Mandatory Capstone Synthetic Data Disclaimer Banner */}
      <div
        role="region"
        aria-label="Synthetic Data Prototype Disclaimer"
        className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800/80 flex items-start gap-3 shadow-2xs"
      >
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-extrabold text-amber-950 dark:text-amber-200 text-xs sm:text-sm">
            {SYNTHETIC_DATA_DISCLAIMER}
          </p>
          <p className="text-[11px] text-amber-800 dark:text-amber-300/90">
            Designed strictly for outpatient clinic administrative planning and resource readiness—never for clinical diagnosis or community disease outbreak surveillance.
          </p>
        </div>
      </div>

      {/* Header & Controls Bar */}
      <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold text-[10px] uppercase tracking-wider">
                Administrator Decision Support
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[10px]">
                {activeReport.observationMonthsCount} Historical Months ({activeReport.historicalPeriodStart} to {activeReport.historicalPeriodEnd})
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Predictive Analytics
            </h1>
            <p className="text-xs text-slate-300 max-w-3xl">
              Monthly outpatient attendance forecasting, recorded symptom consultation trends, and clinic slot capacity alignment using chronological time-series backtesting.
            </p>
          </div>

          {/* Interactive Filters & Refresh */}
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2">
              <Building2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span className="text-[11px] text-slate-300 font-semibold">Branch:</span>
              <select
                aria-label="Clinic Branch Filter"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value as ForecastBranchFilter)}
                className="bg-slate-900 text-white text-xs font-bold rounded-lg px-2 py-1 border border-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-teal-400"
              >
                <option value="ALL">All Clinic Branches</option>
                <option value="Main Outpatient Clinic">Main Outpatient Clinic</option>
                <option value="Annex Satellite Clinic">Annex Satellite Clinic</option>
              </select>
            </label>

            <div
              role="group"
              aria-label="Forecast Horizon"
              className="flex items-center bg-slate-800/90 border border-slate-700 rounded-xl p-1"
            >
              <button
                type="button"
                onClick={() => setHorizonMonths(3)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  horizonMonths === 3
                    ? 'bg-teal-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Next 3 Months
              </button>
              <button
                type="button"
                onClick={() => setHorizonMonths(6)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  horizonMonths === 6
                    ? 'bg-teal-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Next 6 Months
              </button>
            </div>

            <button
              type="button"
              onClick={handleRefreshForecast}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs transition cursor-pointer shadow-sm disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Forecast</span>
            </button>
          </div>
        </div>
      </div>

      {/* Insufficient Overall Data Guard */}
      {activeReport.status === 'insufficient_data' ? (
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
            {activeReport.statusLabel}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
            {activeReport.insufficientReason}
          </p>
        </div>
      ) : (
        <>
          {/* ===================================================================== */}
          {/* SECTION A — MONTHLY PATIENT VOLUME FORECAST                           */}
          {/* ===================================================================== */}
          <section
            aria-labelledby="section-volume-heading"
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                  Section A • Primary Attendance Metric: Completed Visits
                </span>
                <h2
                  id="section-volume-heading"
                  className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white"
                >
                  Monthly Patient Volume Forecast ({horizonMonths}-Month Horizon)
                </h2>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block">
                  Active Model: <strong>{activeReport.selectedModel?.modelName}</strong>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Backtest WAPE: {activeReport.selectedModel?.wape}% • MAE: {activeReport.selectedModel?.mae} visits
                </span>
              </div>
            </div>

            {/* Primary Forecast KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/60 space-y-1">
                <span className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold block">
                  Next Month ({nextMonthForecast?.label}) Expected Visits
                </span>
                <div className="text-2xl font-black text-teal-800 dark:text-teal-300 font-mono">
                  {nextMonthForecast?.predictedCompletedVisits ?? 0}
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">
                  95% Range: {nextMonthForecast?.lowerBound} – {nextMonthForecast?.upperBound} visits
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold block">
                  Projected {horizonMonths}-Month Total Attendance
                </span>
                <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {totalHorizonVisits}
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                  Historical monthly mean: <strong>{historicalAvgVisits}</strong> visits/mo
                </span>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 space-y-1">
                <span className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold block">
                  Highest Projected Demand Month
                </span>
                <div className="text-lg font-black text-indigo-800 dark:text-indigo-300">
                  {peakForecastMonth
                    ? `${formatYearMonthLabel(peakForecastMonth.yearMonth, 'long')} (${peakForecastMonth.predictedCompletedVisits})`
                    : 'N/A'}
                </div>
                <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-semibold block">
                  {peakForecastMonth?.demandLevel || 'Normal Demand'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold block">
                  Latest Observed Month ({latestHistorical?.label}) Breakdown
                </span>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] pt-0.5">
                  <span>
                    Completed: <strong className="font-mono">{latestHistorical?.completedVisits ?? 0}</strong>
                  </span>
                  <span>
                    Scheduled: <strong className="font-mono">{latestHistorical?.scheduledAppointments ?? 0}</strong>
                  </span>
                  <span>
                    Unique Pts: <strong className="font-mono">{latestHistorical?.uniquePatients ?? 0}</strong>
                  </span>
                  <span>
                    Walk-Ins: <strong className="font-mono">{latestHistorical?.walkInVisits ?? 0}</strong>
                  </span>
                  <span className="col-span-2 text-slate-500">
                    No-Shows: <strong className="font-mono">{latestHistorical?.noShows ?? 0}</strong> • Cancelled (excluded):{' '}
                    <strong className="font-mono">{latestHistorical?.cancelled ?? 0}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* SVG Historical vs Forecasted Volume Chart */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  Historical Attendance vs Projected Monthly Visits (with 95% Empirical Interval)
                </span>
                <div className="flex flex-wrap items-center gap-4 text-[11px]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-teal-600 inline-block"></span>
                    <span>Historical Completed Visits</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-slate-400 inline-block"></span>
                    <span>Historical Scheduled Demand</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-0.5 border-t-2 border-dashed border-indigo-600 inline-block"></span>
                    <span>Forecasted Completed Visits</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-2.5 bg-indigo-500/20 border border-indigo-400/40 inline-block rounded-xs"></span>
                    <span>95% Prediction Interval</span>
                  </span>
                </div>
              </div>

              <div className="w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${svgW} ${svgH}`}
                  role="img"
                  aria-label="Monthly patient volume historical and forecast line chart"
                  className="w-full min-w-[640px] h-auto"
                >
                  {/* Horizontal Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                    const val = Math.round(chartMaxY * frac);
                    const y = getY(val);
                    return (
                      <g key={frac}>
                        <line
                          x1={padL}
                          y1={y}
                          x2={svgW - padR}
                          y2={y}
                          stroke="currentColor"
                          className="text-slate-200 dark:text-slate-800"
                          strokeWidth="1"
                        />
                        <text
                          x={padL - 8}
                          y={y + 3}
                          textAnchor="end"
                          className="fill-slate-400 text-[10px] font-mono"
                        >
                          {val}
                        </text>
                      </g>
                    );
                  })}

                  {/* Forecast Cutoff Vertical Divider */}
                  {lastHistIdx >= 0 && (
                    <line
                      x1={getX(lastHistIdx)}
                      y1={padT}
                      x2={getX(lastHistIdx)}
                      y2={svgH - padB}
                      stroke="#6366f1"
                      strokeDasharray="4 4"
                      strokeWidth="1.2"
                    />
                  )}

                  {/* 95% Prediction Uncertainty Band */}
                  {bandPolygonPoints && (
                    <polygon points={bandPolygonPoints} fill="rgba(99, 102, 241, 0.16)" />
                  )}

                  {/* Historical Scheduled Appointments (reference line) */}
                  {histScheduledPath && (
                    <path
                      d={histScheduledPath}
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                    />
                  )}

                  {/* Historical Completed Visits (primary attendance line) */}
                  {histCompletedPath && (
                    <path
                      d={histCompletedPath}
                      fill="none"
                      stroke="#0d9488"
                      strokeWidth="2.5"
                    />
                  )}

                  {/* Forecasted Completed Visits */}
                  {forecastPath && (
                    <path
                      d={forecastPath}
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth="2.5"
                      strokeDasharray="6 4"
                    />
                  )}

                  {/* Data Points & X-Axis Labels */}
                  {recentHistoryForChart.map((h, i) => (
                    <g key={h.yearMonth}>
                      <circle
                        cx={getX(i)}
                        cy={getY(h.completedVisits)}
                        r="3"
                        fill="#0d9488"
                      />
                      {i % 2 === 0 && (
                        <text
                          x={getX(i)}
                          y={svgH - 14}
                          textAnchor="middle"
                          className="fill-slate-500 text-[9px] font-mono"
                        >
                          {h.label}
                        </text>
                      )}
                    </g>
                  ))}

                  {activeReport.volumeForecast.map((f, idx) => {
                    const gx = getX(recentHistoryForChart.length + idx);
                    const gy = getY(f.predictedCompletedVisits);
                    return (
                      <g key={f.yearMonth}>
                        <circle cx={gx} cy={gy} r="4" fill="#4f46e5" />
                        <text
                          x={gx}
                          y={gy - 8}
                          textAnchor="middle"
                          className="fill-indigo-700 dark:fill-indigo-300 text-[9px] font-bold font-mono"
                        >
                          {f.predictedCompletedVisits}
                        </text>
                        <text
                          x={gx}
                          y={svgH - 14}
                          textAnchor="middle"
                          className="fill-indigo-600 dark:fill-indigo-300 text-[9px] font-bold font-mono"
                        >
                          {f.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Upcoming Forecast Monthly Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2.5 px-3">Forecast Month</th>
                    <th className="py-2.5 px-3">Projected Completed Visits</th>
                    <th className="py-2.5 px-3">95% Uncertainty Range</th>
                    <th className="py-2.5 px-3">Projected Scheduled Demand</th>
                    <th className="py-2.5 px-3">Demand Classification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {activeReport.volumeForecast.map((fp) => (
                    <tr key={fp.yearMonth} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        {formatYearMonthLabel(fp.yearMonth, 'long')}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-extrabold text-teal-700 dark:text-teal-300">
                        {fp.predictedCompletedVisits} visits
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                        {fp.lowerBound} – {fp.upperBound}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                        {fp.predictedAppointmentDemand} bookings
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            fp.demandLevel === 'High Demand'
                              ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                              : fp.demandLevel === 'Lower Demand'
                              ? 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                          }`}
                        >
                          {fp.demandLevel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Toggleable Historical Monthly Breakdown Table */}
            <div>
              <button
                type="button"
                onClick={() => setShowHistoricalTable((v) => !v)}
                aria-expanded={showHistoricalTable}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>
                  {showHistoricalTable
                    ? 'Hide Historical Monthly Attendance Breakdown'
                    : `Inspect Historical Monthly Records (${activeReport.historicalVolume.length} Months — Completed, Scheduled, Unique, No-Shows, Walk-Ins)`}
                </span>
              </button>

              {showHistoricalTable && (
                <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="py-2 px-3">Month</th>
                        <th className="py-2 px-3">Completed Visits</th>
                        <th className="py-2 px-3">Scheduled Demand</th>
                        <th className="py-2 px-3">Unique Patients</th>
                        <th className="py-2 px-3">Walk-In Visits</th>
                        <th className="py-2 px-3">No-Shows</th>
                        <th className="py-2 px-3">Cancelled</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                      {[...activeReport.historicalVolume].reverse().map((row) => (
                        <tr key={row.yearMonth}>
                          <td className="py-1.5 px-3 font-sans font-semibold text-slate-800 dark:text-slate-200">
                            {row.label}
                          </td>
                          <td className="py-1.5 px-3 font-bold text-teal-700 dark:text-teal-300">
                            {row.completedVisits}
                          </td>
                          <td className="py-1.5 px-3">{row.scheduledAppointments}</td>
                          <td className="py-1.5 px-3">{row.uniquePatients}</td>
                          <td className="py-1.5 px-3">{row.walkInVisits}</td>
                          <td className="py-1.5 px-3">{row.noShows}</td>
                          <td className="py-1.5 px-3 text-slate-400">{row.cancelled}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* ===================================================================== */}
          {/* SECTION B — MONTHLY CONSULTATION CATEGORY FORECAST                    */}
          {/* ===================================================================== */}
          <section
            aria-labelledby="section-categories-heading"
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Section B • Derived Strictly from Recorded Clinical Consultations
                </span>
                <h2
                  id="section-categories-heading"
                  className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white"
                >
                  Monthly Health Consultation Trends
                </h2>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Administrative outpatient symptom categories (non-diagnostic)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeReport.categoryForecasts.map((cat) => {
                const isInsufficient = cat.status === 'insufficient_data';
                const nextMonthCat = cat.forecastSeries[0] || null;

                return (
                  <div
                    key={cat.category}
                    className={`p-4 rounded-xl border space-y-3 ${
                      isInsufficient
                        ? 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-90'
                        : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {cat.category}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          Historical records: {cat.totalHistoricalCount} consultations across {cat.nonZeroMonths} months
                        </p>
                      </div>

                      {isInsufficient ? (
                        <span className="px-2.5 py-1 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] border border-slate-300 dark:border-slate-700 shrink-0">
                          Insufficient Historical Data
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold border shrink-0 ${
                            cat.trendDirection === 'Increasing'
                              ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                              : cat.trendDirection === 'Decreasing'
                              ? 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                          }`}
                        >
                          {cat.trendDirection === 'Increasing' ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : cat.trendDirection === 'Decreasing' ? (
                            <TrendingDown className="w-3 h-3" />
                          ) : (
                            <Minus className="w-3 h-3" />
                          )}
                          <span>
                            {cat.trendDirection} ({cat.percentChange > 0 ? `+${cat.percentChange}%` : `${cat.percentChange}%`})
                          </span>
                        </span>
                      )}
                    </div>

                    {!isInsufficient && nextMonthCat && (
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-500 block">Recent 3-Mo Avg</span>
                          <strong className="font-mono text-sm text-slate-800 dark:text-slate-200">
                            {cat.recent3MonthAvg}/mo
                          </strong>
                        </div>
                        <div className="p-2.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
                          <span className="text-[10px] text-indigo-700 dark:text-indigo-300 block">
                            Expected ({nextMonthCat.label})
                          </span>
                          <strong className="font-mono text-sm text-indigo-900 dark:text-indigo-200">
                            {nextMonthCat.predictedCount}
                          </strong>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-500 block">Peak Window</span>
                          <strong className="font-mono text-xs text-slate-800 dark:text-slate-200">
                            {cat.peakProjectedMonth
                              ? `${cat.peakProjectedMonth.label.split(' ')[0]} (${cat.peakProjectedMonth.count})`
                              : 'N/A'}
                          </strong>
                        </div>
                      </div>
                    )}

                    {!isInsufficient && cat.forecastSeries.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-slate-600 dark:text-slate-300">
                        {cat.forecastSeries.map((pt) => (
                          <span
                            key={pt.yearMonth}
                            className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                          >
                            {pt.label}: <strong>{pt.predictedCount}</strong>
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      {cat.planningExplanation}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ===================================================================== */}
          {/* SECTION C — PATIENT DEMAND VS CLINIC CAPACITY                         */}
          {/* ===================================================================== */}
          <section
            aria-labelledby="section-capacity-heading"
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                  Section C • Independent Schedule & Staffing Throughput Calculation
                </span>
                <h2
                  id="section-capacity-heading"
                  className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white"
                >
                  Patient Demand vs Clinic Capacity
                </h2>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Computed from active physicians&apos; working days, shift hours, 30-min slots, and support staff
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2.5 px-3">Month</th>
                    <th className="py-2.5 px-3">Active Roster</th>
                    <th className="py-2.5 px-3">Configured Monthly Slot Capacity</th>
                    <th className="py-2.5 px-3">Projected Demand (Bookings)</th>
                    <th className="py-2.5 px-3">Utilization</th>
                    <th className="py-2.5 px-3">Capacity Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {activeReport.capacityComparison.map((cap) => (
                    <tr key={cap.yearMonth}>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        {cap.label}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        {cap.activeDoctorsCount} MDs • {cap.activeSupportStaffCount} Staff
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {cap.staffAdjustedCapacity} slots
                      </td>
                      <td className="py-2.5 px-3 font-mono text-indigo-700 dark:text-indigo-300 font-bold">
                        {cap.predictedAppointmentDemand} ({cap.predictedCompletedVisits} completed)
                      </td>
                      <td className="py-2.5 px-3 w-44">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                cap.utilizationPercent >= 100
                                  ? 'bg-rose-500'
                                  : cap.utilizationPercent >= 80
                                  ? 'bg-amber-500'
                                  : 'bg-teal-500'
                              }`}
                              style={{ width: `${Math.min(100, cap.utilizationPercent)}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-[11px]">
                            {cap.utilizationPercent}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            cap.capacityStatus.includes('Exceeds')
                              ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                              : cap.capacityStatus.includes('Near')
                              ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                          }`}
                        >
                          {cap.capacityStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ===================================================================== */}
          {/* SECTION D — FORECAST INFORMATION & CHRONOLOGICAL BACKTESTING          */}
          {/* ===================================================================== */}
          <section
            aria-labelledby="section-info-heading"
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Section D • Model Transparency & Synthetic-Data Backtest Metrics
                </span>
                <h2
                  id="section-info-heading"
                  className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white"
                >
                  Forecast Information & Statistical Validation
                </h2>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold text-[10px]">
                Synthetic-Data Evaluation Metrics Only
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Forecast Generated (PST)
                </span>
                <strong className="font-mono text-xs text-slate-900 dark:text-white mt-0.5 block">
                  {formatManilaDateTime(activeReport.generatedAtIso)}
                </strong>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Historical Training Window
                </span>
                <strong className="font-mono text-xs text-slate-900 dark:text-white mt-0.5 block">
                  {activeReport.historicalPeriodStart} → {activeReport.historicalPeriodEnd} ({activeReport.observationMonthsCount} mos)
                </strong>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Selected Forecasting Method
                </span>
                <strong className="text-xs text-teal-700 dark:text-teal-300 mt-0.5 block">
                  {activeReport.selectedModel?.modelName}
                </strong>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Leakage & Deduplication Guard
                </span>
                <strong className="text-xs text-slate-900 dark:text-white mt-0.5 block">
                  Rolling-Origin Slice • Rescheduled/Cancelled Excluded
                </strong>
              </div>
            </div>

            {/* Candidate Models Rolling-Origin Comparison Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2.5 px-3">Candidate Statistical Method</th>
                    <th className="py-2.5 px-3">Formula Specification</th>
                    <th className="py-2.5 px-3">MAE</th>
                    <th className="py-2.5 px-3">RMSE</th>
                    <th className="py-2.5 px-3">WAPE (%)</th>
                    <th className="py-2.5 px-3">vs Naive Baseline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {activeReport.candidateEvaluations.map((ev) => {
                    const isSelected = activeReport.selectedModel?.modelId === ev.modelId;
                    return (
                      <tr
                        key={ev.modelId}
                        className={
                          isSelected
                            ? 'bg-teal-50/60 dark:bg-teal-950/30 font-semibold'
                            : undefined
                        }
                      >
                        <td className="py-2.5 px-3 text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <span>{ev.modelName}</span>
                            {isSelected && (
                              <span className="px-1.5 py-0.2 rounded bg-teal-600 text-white text-[9px] font-bold uppercase">
                                Selected
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {ev.formulaDescription}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {ev.eligible ? ev.mae.toFixed(2) : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {ev.eligible ? ev.rmse.toFixed(2) : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold">
                          {ev.eligible ? `${ev.wape.toFixed(2)}%` : 'Ineligible'}
                        </td>
                        <td className="py-2.5 px-3">
                          {ev.modelId === 'naive_baseline' ? (
                            <span className="text-[11px] text-slate-500">Benchmark Reference</span>
                          ) : ev.beatsBaseline ? (
                            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                              Outperforms Baseline
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500">
                              {ev.ineligibleReason || 'Higher Error'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-teal-600" />
                <span>Methodological Notes & Data Limitations</span>
              </span>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                {activeReport.limitations.map((lim, idx) => (
                  <li key={idx}>{lim}</li>
                ))}
              </ul>
            </div>
          </section>

          {/* ===================================================================== */}
          {/* SECTION E — ADMINISTRATIVE PLANNING INSIGHTS                          */}
          {/* ===================================================================== */}
          <section
            aria-labelledby="section-insights-heading"
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4"
          >
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                Section E • Outpatient Operations & Resource Readiness
              </span>
              <h2
                id="section-insights-heading"
                className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white"
              >
                Administrative Planning Insights
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeReport.administrativeInsights.map((ins) => (
                <div
                  key={ins.id}
                  className={`p-4 rounded-xl border space-y-1.5 ${
                    ins.severity === 'high'
                      ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                      : ins.severity === 'attention'
                      ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
                      : 'bg-teal-50/50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      {ins.category}
                    </span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {ins.title}
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    {ins.detail}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

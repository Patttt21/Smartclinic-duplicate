import React from 'react';
import { SmartClinicLogo } from './SmartClinicLogo';

export interface RoleHeroBadge {
  text: string;
  icon?: React.ReactNode;
  pulseDot?: boolean;
  pulseColor?: string;
  className?: string;
}

export interface RoleHeroAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary';
  primaryColor?: string;
  ariaLabel?: string;
  title?: string;
}

export interface RoleHeroBannerProps {
  badges: RoleHeroBadge[];
  title: React.ReactNode;
  onTitleClick?: () => void;
  titleTooltip?: string;
  meta: React.ReactNode;
  actions?: RoleHeroAction[];
  gradientClass?: string;
  logoGlow?: boolean;
  className?: string;
}

export const RoleHeroBanner: React.FC<RoleHeroBannerProps> = ({
  badges,
  title,
  onTitleClick,
  titleTooltip,
  meta,
  actions,
  gradientClass = 'bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 border-teal-700/40',
  logoGlow = true,
  className = '',
}) => {
  return (
    <header
      className={`rounded-3xl p-5 sm:p-7 text-white shadow-xl border flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all ${gradientClass} ${className}`}
      aria-label="Dashboard Hero Overview"
    >
      {/* Left: Brand Identity, Badges, Title, & Meta Details */}
      <div className="flex items-center sm:items-start md:items-center gap-4 min-w-0 flex-1">
        <div className="shrink-0">
          <SmartClinicLogo className="w-13 h-13 sm:w-14 sm:h-14" glow={logoGlow} />
        </div>

        <div className="min-w-0 space-y-1.5 flex-1">
          {/* Badge Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {badges.map((badge, idx) => (
              <span
                key={idx}
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur-xs transition-colors ${
                  badge.className || 'bg-white/10 text-teal-200 border-white/20'
                }`}
              >
                {badge.pulseDot && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${badge.pulseColor || 'bg-emerald-400'} animate-pulse shrink-0`}
                    aria-hidden="true"
                  />
                )}
                {badge.icon && <span className="shrink-0 flex items-center">{badge.icon}</span>}
                <span className="whitespace-nowrap sm:truncate max-w-[320px]">{badge.text}</span>
              </span>
            ))}
          </div>

          {/* Title */}
          <h1
            onClick={onTitleClick}
            className={`text-xl sm:text-2xl lg:text-[26px] font-black text-white tracking-tight leading-snug break-words ${
              onTitleClick
                ? 'cursor-pointer hover:text-teal-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 rounded-md transition-colors'
                : ''
            }`}
            title={titleTooltip}
            tabIndex={onTitleClick ? 0 : undefined}
            onKeyDown={
              onTitleClick
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onTitleClick();
                    }
                  }
                : undefined
            }
          >
            {title}
          </h1>

          {/* Meta Description / EMR Attributes */}
          <div className="text-xs text-slate-100/90 font-medium leading-relaxed">
            {meta}
          </div>
        </div>
      </div>

      {/* Right: Role-Aware Quick Action Hierarchy */}
      {actions && actions.length > 0 && (
        <div className="flex items-center gap-2.5 self-stretch md:self-auto flex-wrap sm:flex-nowrap md:flex-wrap shrink-0">
          {actions.map((action, idx) => {
            const isPrimary = action.variant === 'primary';
            const defaultPrimaryClass =
              'bg-teal-400 hover:bg-teal-300 text-slate-950 shadow-md shadow-teal-500/20 focus-visible:ring-teal-300';

            return (
              <button
                key={idx}
                onClick={action.onClick}
                type="button"
                aria-label={action.ariaLabel || action.label}
                title={action.title || action.label}
                className={`px-3.5 sm:px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 cursor-pointer w-full sm:w-auto ${
                  isPrimary
                    ? action.primaryColor || defaultPrimaryClass
                    : 'bg-white/10 hover:bg-white/20 active:bg-white/25 text-white border border-white/20 hover:border-white/30 backdrop-blur-xs focus-visible:ring-teal-300'
                }`}
              >
                {action.icon && <span className="shrink-0 flex items-center">{action.icon}</span>}
                <span className="whitespace-nowrap">{action.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};

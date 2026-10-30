import React from 'react';
import { Check, X, ShieldCheck, AlertTriangle } from 'lucide-react';
import { validatePasswordStrength } from '../../utils/passwordValidation';

interface Props {
  password: string;
  showDetails?: boolean;
}

export const PasswordStrengthIndicator: React.FC<Props> = ({
  password,
  showDetails = true,
}) => {
  if (!password && !showDetails) return null;

  const result = validatePasswordStrength(password);
  const passedCount = result.rules.filter((r) => r.passed).length;
  const strengthPercent = (passedCount / result.rules.length) * 100;

  const strengthLabel =
    passedCount === 5
      ? 'Strong (High Security)'
      : passedCount >= 3
      ? 'Medium'
      : 'Weak';

  const barColor =
    passedCount === 5
      ? 'bg-emerald-500'
      : passedCount >= 3
      ? 'bg-amber-500'
      : 'bg-rose-500';

  return (
    <div className="space-y-2 pt-1 font-sans text-xs">
      {/* Progress Bar & Label */}
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
          {result.isValid ? (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          )}
          <span>Password Strength:</span>
        </span>
        <span
          className={`font-bold ${
            passedCount === 5
              ? 'text-emerald-600 dark:text-emerald-400'
              : passedCount >= 3
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          {strengthLabel}
        </span>
      </div>

      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 rounded-full ${barColor}`}
          style={{ width: `${strengthPercent}%` }}
        />
      </div>

      {/* Rules Checklist */}
      {showDetails && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
          {result.rules.map((rule) => (
            <div
              key={rule.id}
              className={`flex items-center gap-1.5 text-[11px] transition-colors ${
                rule.passed
                  ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {rule.passed ? (
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                </div>
              ) : (
                <div className="w-3.5 h-3.5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <X className="w-2.5 h-2.5 text-slate-400" />
                </div>
              )}
              <span>{rule.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

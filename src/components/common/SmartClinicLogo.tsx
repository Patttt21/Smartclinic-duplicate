import React from 'react';

interface Props {
  className?: string;
  size?: number | string;
  glow?: boolean;
}

export const SmartClinicLogo: React.FC<Props> = ({
  className = 'w-9 h-9',
  size,
  glow = false,
}) => {
  return (
    <div
      style={size ? { width: size, height: size } : undefined}
      className={`relative inline-flex items-center justify-center shrink-0 aspect-square ${className}`}
    >
      {glow && (
        <div className="absolute inset-0 rounded-full bg-teal-400/25 blur-md animate-pulse pointer-events-none" />
      )}
      <svg
        viewBox="0 0 500 500"
        className="w-full h-full object-contain overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Cyan/Teal Shield Ribbon Gradient */}
          <linearGradient id="scTealGradComp" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="35%" stopColor="#06b6d4" />
            <stop offset="70%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>

          {/* Deep Navy Ribbon Gradient */}
          <linearGradient id="scNavyGradComp" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#072b4a" />
            <stop offset="40%" stopColor="#0c4a6e" />
            <stop offset="85%" stopColor="#0f3b60" />
            <stop offset="100%" stopColor="#164e63" />
          </linearGradient>

          {/* Calendar Body Gradient */}
          <linearGradient id="scCalGradComp" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0f3b60" />
            <stop offset="100%" stopColor="#082842" />
          </linearGradient>

          {/* Medical Cross Gradient */}
          <linearGradient id="scCrossGradComp" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>

          {/* Vibrant Green Checkmark Gradient */}
          <linearGradient id="scCheckGradComp" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#15803d" />
            <stop offset="50%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#4ade80" />
          </linearGradient>

          {/* Drop Shadows */}
          <filter id="scShadowComp" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0c4a6e" floodOpacity="0.25" />
          </filter>

          <filter id="scCheckGlowComp" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#22c55e" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Outer Dynamic Swirling Shield Ribbons */}
        <g filter="url(#scShadowComp)">
          {/* Navy Outer Shield Left Arc */}
          <path
            d="M250 50 C295 50 335 62 370 85 C330 92 290 108 250 130 C205 155 170 195 155 245 C145 280 148 315 160 350 C135 305 130 250 145 200 C162 145 198 90 250 50 Z"
            fill="url(#scNavyGradComp)"
          />

          {/* Teal Outer Shield Top-Right & Bottom-Right Arc */}
          <path
            d="M370 85 C420 130 445 190 435 255 C425 315 390 370 340 405 C305 430 265 448 250 450 C240 445 210 425 185 395 C220 405 260 395 295 370 C340 338 370 288 375 235 C380 180 355 125 315 95 C335 90 355 87 370 85 Z"
            fill="url(#scTealGradComp)"
          />

          {/* Deep Navy Left-Bottom Shield Flange */}
          <path
            d="M145 200 C135 250 140 305 165 350 C185 385 215 415 250 450 C235 440 195 400 170 360 C145 320 135 270 145 200 Z"
            fill="url(#scNavyGradComp)"
          />

          {/* Cyan Inner Top Swoosh Arc */}
          <path
            d="M210 100 C270 70 345 80 390 125 C350 135 305 160 270 195 C235 230 215 275 210 320 C205 270 220 220 250 175 C270 145 295 125 325 110 C290 100 245 98 210 100 Z"
            fill="url(#scTealGradComp)"
            opacity="0.95"
          />

          {/* Dark Navy Bottom Swoosh Wrap */}
          <path
            d="M250 450 C280 430 330 395 365 345 C340 370 300 390 260 395 C230 398 200 390 180 375 C198 408 226 434 250 450 Z"
            fill="url(#scNavyGradComp)"
          />
        </g>

        {/* Inner Shield Core / Calendar Badge */}
        <g filter="url(#scShadowComp)">
          <rect
            x="170"
            y="130"
            width="160"
            height="175"
            rx="28"
            fill="url(#scCalGradComp)"
            stroke="#0284c7"
            strokeWidth="5"
          />

          {/* Calendar Rings / Binder Loops */}
          <rect x="202" y="112" width="16" height="34" rx="8" fill="#ffffff" />
          <rect x="205" y="115" width="10" height="28" rx="5" fill="#0284c7" />

          <rect x="282" y="112" width="16" height="34" rx="8" fill="#ffffff" />
          <rect x="285" y="115" width="10" height="28" rx="5" fill="#0284c7" />

          {/* Calendar Header Line */}
          <line x1="175" y1="180" x2="325" y2="180" stroke="#0ea5e9" strokeWidth="3" opacity="0.4" />

          {/* Calendar Grid Lines */}
          <line x1="220" y1="185" x2="220" y2="295" stroke="#38bdf8" strokeWidth="2" opacity="0.3" strokeDasharray="3 3" />
          <line x1="280" y1="185" x2="280" y2="295" stroke="#38bdf8" strokeWidth="2" opacity="0.3" strokeDasharray="3 3" />
          <line x1="175" y1="225" x2="325" y2="225" stroke="#38bdf8" strokeWidth="2" opacity="0.3" strokeDasharray="3 3" />
          <line x1="175" y1="265" x2="325" y2="265" stroke="#38bdf8" strokeWidth="2" opacity="0.3" strokeDasharray="3 3" />

          {/* Medical Cross in Center */}
          <g>
            <rect x="236" y="200" width="28" height="75" rx="6" fill="url(#scCrossGradComp)" />
            <rect x="212" y="224" width="76" height="27" rx="6" fill="url(#scCrossGradComp)" />
          </g>

          {/* Cross Center Glow Highlight */}
          <circle cx="250" cy="237" r="10" fill="#a5f3fc" opacity="0.6" />
        </g>

        {/* Dynamic Vibrant Green Checkmark */}
        <g filter="url(#scCheckGlowComp)">
          <path
            d="M210 248 L242 284 C246 288 252 288 256 284 L375 145 C380 139 375 130 367 133 L251 254 L225 228 C218 221 206 230 210 248 Z"
            fill="url(#scCheckGradComp)"
          />
          <path
            d="M246 282 L372 142 C376 137 372 133 368 136 L253 255 Z"
            fill="#ffffff"
            opacity="0.5"
          />
        </g>
      </svg>
    </div>
  );
};

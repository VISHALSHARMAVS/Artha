import React from 'react';

interface ArthaGlyphProps {
  size?: number | string;
  className?: string;
  variant?: 'color' | 'white' | 'mono-blue' | 'mono-green';
  withPulse?: boolean;
}

/**
 * The Master Mark: "The Artha Glyph" (अ-Vector)
 * Mathematically constructed Devanagari "अ" letterform mark:
 * 1. The Shirorekha (Top Roof Bar)
 * 2. The Purna Danda (Vertical Stem)
 * 3. Compound Growth Arcs
 * 4. Emerald Telemetry Pulse (#10B981)
 */
export const ArthaGlyph: React.FC<ArthaGlyphProps> = ({
  size = 28,
  className = '',
  variant = 'color',
  withPulse = true,
}) => {
  const gradientId = React.useId();
  const filterId = React.useId();

  const getStroke = () => {
    switch (variant) {
      case 'white':
        return '#FFFFFF';
      case 'mono-blue':
        return '#2563EB';
      case 'mono-green':
        return '#10B981';
      case 'color':
      default:
        return `url(#${gradientId})`;
    }
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={`shrink-0 select-none ${className}`}
      aria-label="Artha brand glyph"
    >
      <defs>
        <linearGradient id={gradientId} x1="120" y1="120" x2="380" y2="400" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        {withPulse && (
          <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#10B981" floodOpacity="0.8" />
          </filter>
        )}
      </defs>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Shirorekha (Top Roof Bar) */}
        <path d="M 180 120 L 372 120" stroke={getStroke()} strokeWidth="36" />
        {/* Upper Growth Arc */}
        <path d="M 216 156 C 152 156 128 192 128 232 C 128 272 164 288 216 288" stroke={getStroke()} strokeWidth="36" />
        {/* Lower Growth Arc */}
        <path d="M 216 288 C 152 288 120 324 120 368 C 120 416 164 432 216 432 C 264 432 296 404 308 368" stroke={getStroke()} strokeWidth="36" />
        {/* Horizontal Connector */}
        <path d="M 216 288 L 340 288" stroke={getStroke()} strokeWidth="36" />
        {/* Purna Danda (Vertical Stem) */}
        <path d="M 340 120 L 340 432" stroke={getStroke()} strokeWidth="38" />
        {/* Emerald Telemetry Pulse */}
        <circle
          cx="410"
          cy="120"
          r="16"
          fill="#10B981"
          stroke="none"
          filter={withPulse ? `url(#${filterId})` : undefined}
          className={withPulse ? 'animate-pulse' : undefined}
        />
      </g>
    </svg>
  );
};

interface ArthaBrandLockupProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showDescriptor?: boolean;
}

/**
 * Official Horizontal Brand Lockup:
 * Glyph + "Artha" Wordmark + "FINANCIAL TELEMETRY"
 */
export const ArthaBrandLockup: React.FC<ArthaBrandLockupProps> = ({
  size = 'md',
  className = '',
  showDescriptor = true,
}) => {
  const glyphSizes = {
    sm: 22,
    md: 28,
    lg: 36,
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const descriptorSizes = {
    sm: 'text-[9px] tracking-[0.2em]',
    md: 'text-[10px] tracking-[0.25em]',
    lg: 'text-xs tracking-[0.3em]',
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <ArthaGlyph size={glyphSizes[size]} />
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`font-sans font-extrabold tracking-tight text-slate-900 dark:text-[#F8FAFC] ${textSizes[size]}`}>
            Artha
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" title="WhatsApp bot telemetry active" />
        </div>
        {showDescriptor && (
          <span className={`font-sans font-bold uppercase text-slate-400 dark:text-[#94A3B8] mt-0.5 leading-none ${descriptorSizes[size]}`}>
            FINANCIAL TELEMETRY
          </span>
        )}
      </div>
    </div>
  );
};

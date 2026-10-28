import React from 'react';

interface RocketieeLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<RocketieeLogoProps['size']>, string> = {
  sm: 'w-8 h-8 rounded-xl',
  md: 'w-10 h-10 rounded-2xl',
  lg: 'w-16 h-16 rounded-3xl',
  xl: 'w-24 h-24 rounded-[28px]',
};

export const RocketieeLogo: React.FC<RocketieeLogoProps> = ({
  size = 'md',
  animated = false,
  className = '',
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 shadow-sm border border-white/60 select-none shrink-0 ${SIZE_CLASSES[size]} ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-[78%] h-[78%] ${animated ? 'animate-bounce' : ''}`}
      >
        {/* Orbit Ring */}
        <ellipse
          cx="60"
          cy="64"
          rx="44"
          ry="16"
          transform="rotate(-22 60 64)"
          stroke="#FFFFFF"
          strokeOpacity="0.55"
          strokeWidth="2.5"
          strokeDasharray="5 4"
        />

        {/* Thrust Flame */}
        <path
          d="M49 84C49 84 54 106 60 112C66 106 71 84 71 84H49Z"
          fill="#FFFFFF"
          fillOpacity="0.95"
        />
        <path
          d="M53 84C53 84 56 99 60 104C64 99 67 84 67 84H53Z"
          fill="#F97316"
        />

        {/* Side Fins */}
        <path
          d="M44 63L30 80C28.5 81.8 29.8 84.5 32.1 84.5H46L44 63Z"
          fill="#FEF08A"
        />
        <path
          d="M76 63L90 80C91.5 81.8 90.2 84.5 87.9 84.5H74L76 63Z"
          fill="#FEF08A"
        />

        {/* Main Pure White Rocket Body */}
        <path
          d="M60 14C46 28 40 50 42 80C42.3 83 44.8 85 47.8 85H72.2C75.2 85 77.7 83 78 80C80 50 74 28 60 14Z"
          fill="#FFFFFF"
        />

        {/* Golden Nose Cap */}
        <path
          d="M60 14C53.5 20.5 49 28.5 46.2 38H73.8C71 28.5 66.5 20.5 60 14Z"
          fill="#FEF08A"
        />

        {/* Cockpit Window */}
        <circle cx="60" cy="53" r="11" fill="#EAB308" />
        <circle cx="60" cy="53" r="7.2" fill="#0F172A" />
        <circle cx="57.5" cy="50.5" r="2.2" fill="#FFFFFF" />

        {/* Center Fin */}
        <rect x="57.5" y="72" width="5" height="16" rx="2.5" fill="#EAB308" />
      </svg>
    </div>
  );
};

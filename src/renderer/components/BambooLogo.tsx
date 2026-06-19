import React from 'react';

interface BambooLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
}

export default function BambooLogo({ className = '', size = 'md' }: BambooLogoProps) {
  const getPixelSize = () => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'sm': return 32;
      case 'md': return 40;
      case 'lg': return 64;
      case 'xl': return 96;
      default: return 40;
    }
  };

  const pSize = getPixelSize();

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 ${className}`}
      style={{ width: `${pSize}px`, height: `${pSize}px` }}
    >
      <div className="absolute inset-0 bg-[#7cffc4]/15 rounded-full blur-md animate-pulse" />

      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
        className="relative z-10 transition-transform hover:scale-105 duration-300 drop-shadow-[0_2px_8px_rgba(124,255,196,0.25)]"
      >
        <defs>
          <linearGradient id="bambooLogoStalkGrad" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7cffc4" />
            <stop offset="50%" stopColor="#00E5FF" />
            <stop offset="100%" stopColor="#00B0FF" />
          </linearGradient>
          <linearGradient id="bambooLogoStalkGradSecondary" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7cffc4" />
            <stop offset="100%" stopColor="#00f2fe" />
          </linearGradient>
        </defs>

        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="url(#bambooLogoStalkGrad)"
          strokeWidth="1.5"
          strokeDasharray="40 12 10 12"
          className="opacity-40 animate-[spin_40s_linear_infinite] origin-center"
          style={{ transformOrigin: 'center' }}
        />

        <circle
          cx="50"
          cy="50"
          r="41"
          stroke="white"
          strokeWidth="0.5"
          strokeDasharray="2 6"
          className="opacity-15"
        />

        <path
          d="M32 72 L32 54 C32 52 33 50 35 50 L39 50 C41 50 42 52 42 54 L42 72 C42 74 41 75 39 75 L35 75 C33 75 32 74 32 72 Z"
          fill="url(#bambooLogoStalkGradSecondary)"
          className="opacity-80"
        />
        <path
          d="M32 46 L32 30 C32 28.5 33 27 35 27 L39 27 C41 27 42 28.5 42 30 L42 46 C42 47.5 41 49 39 49 L35 49 C33 49 32 47.5 32 46 Z"
          fill="url(#bambooLogoStalkGradSecondary)"
          className="opacity-70"
        />

        <path
          d="M48 75 L48 48 C48 45.5 49.5 43.5 52 43.5 L58 43.5 C60.5 43.5 62 45.5 62 48 L62 75 C62 77.5 60.5 78.5 58 78.5 L52 78.5 C49.5 78.5 48 77.5 48 75 Z"
          fill="url(#bambooLogoStalkGrad)"
        />
        <path
          d="M48 39.5 L48 18 C48 15.5 49.5 13.5 52 13.5 L58 13.5 C60.5 13.5 62 15.5 62 18 L62 39.5 C62 42 60.5 43 58 43 L52 43 C49.5 43 48 42 48 39.5 Z"
          fill="url(#bambooLogoStalkGrad)"
        />

        <rect
          x="47"
          y="41.5"
          width="16"
          height="3"
          rx="1.5"
          fill="#05080c"
          stroke="url(#bambooLogoStalkGrad)"
          strokeWidth="1"
        />
        <rect
          x="31"
          y="47.5"
          width="12"
          height="2"
          rx="1"
          fill="#05080c"
          stroke="url(#bambooLogoStalkGradSecondary)"
          strokeWidth="0.75"
        />

        <path
          d="M32 48 C22 44 18 32 21 26 C26 26 31 32 32 40 Z"
          fill="#7cffc4"
          className="opacity-95"
        />
        <path
          d="M62 43.5 C74 41 78 28 75 22 C69 22 64 29 62 36 Z"
          fill="#00f2fe"
        />
        <path
          d="M62 18 C72 16 75 8 72 4 C67 5 63 11 62 14 Z"
          fill="#7cffc4"
        />
      </svg>
    </div>
  );
}

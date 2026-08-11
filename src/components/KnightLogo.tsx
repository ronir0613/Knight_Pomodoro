import React from 'react';

type Variant = 'primary' | 'simplified' | 'monochrome';

interface KnightLogoProps {
  size?: number | string;
  variant?: Variant;
  className?: string;
  color?: string; // used for monochrome
}

export const KnightLogo: React.FC<KnightLogoProps> = ({ 
  size = 24, 
  variant = 'primary', 
  className = '',
  color = 'currentColor'
}) => {
  const isSimplified = variant === 'simplified';
  const isMonochrome = variant === 'monochrome';

  // The brief states:
  // Shield -> discipline, protecting time
  // Clock -> time and focus
  // Diamond -> progress and achievement

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Shield Outline */}
      {/* Moderately rounded shoulders, narrower at bottom */}
      <path 
        d="M12 22C12 22 20 18 20 9V5L12 2L4 5V9C4 18 12 22 12 22Z" 
        stroke={isMonochrome ? color : "currentColor"} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        className={!isMonochrome ? "text-knight-dark dark:text-knight-accent" : ""}
      />
      
      {/* Clock Face */}
      <circle 
        cx="12" 
        cy="12.5" 
        r="4.5" 
        stroke={isMonochrome ? color : "currentColor"} 
        strokeWidth="1.5"
        className={!isMonochrome ? "text-knight-accent dark:text-knight-silver" : ""}
      />
      
      {/* Clock Hands */}
      <path 
        d="M12 10V12.5L13.5 14" 
        stroke={isMonochrome ? color : "currentColor"} 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        className={!isMonochrome ? "text-knight-accent dark:text-knight-silver" : ""}
      />

      {/* Diamond Accent */}
      {!isSimplified && (
        <path 
          d="M12 4.5L13 5.5L12 6.5L11 5.5Z" 
          fill={isMonochrome ? color : "currentColor"}
          className={!isMonochrome ? "text-knight-accent dark:text-knight-accent" : ""}
        />
      )}
    </svg>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import dbInstance from '../db/store';

interface GlobalizeLogoProps {
  className?: string;
  size?: number; // Size of the icon
  showText?: boolean;
  textColorClass?: string;
  isRtl?: boolean;
}

export const GlobalizeLogo: React.FC<GlobalizeLogoProps> = ({
  className = '',
  size = 40,
  showText = true,
  textColorClass = 'text-slate-100',
  isRtl = false
}) => {
  const companyName = dbInstance.brandConfig?.companyName || '';
  const slogan = isRtl ? (dbInstance.brandConfig?.sloganAr || '') : (dbInstance.brandConfig?.slogan || '');

  return (
    <div className={`flex items-center gap-3 select-none ${className} ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* SVG Icon */}
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Dynamic Stylized Blue Wave 1 (Deep Navy) */}
        <path 
          d="M 12 65 C 10 75 16 85 24 88 C 15 84 8 72 10 58 C 12 44 26 36 38 34 C 23 37 14 48 12 65 Z" 
          fill="#1E3A8A" 
        />
        
        {/* Dynamic Stylized Blue Wave 2 (Royal Blue Coils) */}
        <path 
          d="M 18 72 C 16 80 23 88 32 89 C 24 85 18 76 21 64 C 24 50 40 40 52 38 C 36 41 23 54 18 72 Z" 
          fill="#0046AD" 
        />

        {/* Dynamic Stylized Blue Wave 3 (Ocean Cyan Accent) */}
        <path 
          d="M 26 78 C 24 85 32 91 40 90 C 33 87 28 80 30 70 C 33 58 48 48 60 46 C 45 49 31 62 26 78 Z" 
          fill="#0EA5E9" 
        />

        {/* Main Bold Golden-Yellow C/G outer crescent */}
        <path 
          d="M 85 36 C 85 20 65 8 46 12 C 22 17 6 42 10 68 C 13 86 32 94 48 83 C 32 90 18 82 16 64 C 12 43 28 22 48 18 C 64 15 80 24 80 36 C 80 43 74 48 68 45 C 56 39 42 42 36 54 C 30 66 32 78 44 81 C 52 83 62 82 72 74 C 74 80 66 84 58 85 C 44 87 34 81 28 72" 
          fill="#FABD15" 
        />
        
        {/* Inner Golden curl hook */}
        <path
          d="M 72 36 C 72 40 68 42 64 40 C 58 37 50 38 46 44 C 42 50 44 58 50 60 C 56 62 62 60 66 54 C 68 50 74 48 78 52 C 82 56 80 64 74 70 C 66 78 52 80 40 76 C 28 72 22 58 26 44 C 30 30 44 22 58 24 C 68 26 72 30 72 36 Z"
          fill="#F29E05"
        />
      </svg>

      {/* Brand Text styling */}
      {showText && (
        <div className={`flex flex-col ${isRtl ? 'text-right items-end' : 'text-left items-start'}`}>
          <div className="flex items-center gap-1">
            <span className={`text-base font-black tracking-tight font-sans ${textColorClass}`}>
              {companyName}
            </span>
          </div>
          <span className="text-[9px] font-semibold text-[#8EB7FA] uppercase tracking-widest leading-none mt-0.5 whitespace-nowrap">
            {slogan}
          </span>
        </div>
      )}
    </div>
  );
};

export default GlobalizeLogo;

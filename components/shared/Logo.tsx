
import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'light' | 'dark' | 'white';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = '', variant = 'light', size = 'md', showText = true }) => {
  const sizeMap = {
    sm: { box: 'w-8 h-8 text-[10px]', text: 'text-xs' },
    md: { box: 'w-11 h-11 text-sm', text: 'text-sm' },
    lg: { box: 'w-16 h-16 text-xl', text: 'text-lg' },
    xl: { box: 'w-24 h-24 text-3xl', text: 'text-2xl' }
  };

  const colors = {
    light: 'bg-blue-600 shadow-blue-600/20',
    dark: 'bg-slate-900 shadow-slate-900/20',
    white: 'bg-white shadow-white/10'
  };

  const textColors = {
    light: 'text-white',
    dark: 'text-white',
    white: 'text-blue-600'
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div 
        className={`${currentSize.box} ${colors[variant]} rounded-[1.2rem] flex items-center justify-center shadow-2xl transition-all shrink-0 overflow-hidden`}
      >
        <img src="/logo.jpg" alt="ALS" className="w-full h-full object-cover" />
      </div>
      
      {showText && (
        <div className="flex flex-col leading-none">
          <span 
            className={`font-black uppercase tracking-tighter ${variant === 'white' ? 'text-white' : 'text-slate-800'}`}
            style={{ fontSize: currentSize.text }}
          >
            ALS Logística
          </span>
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">
            Transportes SSZ
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;

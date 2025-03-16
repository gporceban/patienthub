
import React from 'react';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
}

const Logo: React.FC<LogoProps> = ({ size = 'medium' }) => {
  const sizeClasses = {
    small: 'text-2xl md:text-3xl',
    medium: 'text-3xl md:text-4xl',
    large: 'text-4xl md:text-5xl',
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-darkblue-700 to-darkblue-900 flex items-center justify-center overflow-hidden border border-gold-400/30">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-gold-400 text-2xl font-bold transform -rotate-45">O</span>
          </div>
        </div>
      </div>
      <div className={`font-heading font-bold ${sizeClasses[size]}`}>
        <span className="text-white">Ortho</span>
        <span className="text-gold-400">Care</span>
        <span className="text-darkblue-300">Mosaic</span>
      </div>
    </div>
  );
};

export default Logo;

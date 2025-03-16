
import React from 'react';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
}

const Logo: React.FC<LogoProps> = ({ size = 'medium' }) => {
  const sizeClasses = {
    small: 'h-8 md:h-10',
    medium: 'h-12 md:h-16',
    large: 'h-20 md:h-24',
  };

  return (
    <div className="flex items-center justify-center">
      <img 
        src="/lovable-uploads/058d1a3a-0618-461f-a21b-3430a79eee43.png" 
        alt="Patient Hub by Dr. Porceban"
        className={`${sizeClasses[size]} w-auto filter drop-shadow-lg`}
        style={{ 
          filter: 'drop-shadow(0 0 10px rgba(253, 207, 154, 0.3))'
        }}
      />
    </div>
  );
};

export default Logo;

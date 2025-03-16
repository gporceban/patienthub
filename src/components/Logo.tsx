
import React from 'react';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
}

const Logo: React.FC<LogoProps> = ({ size = 'medium' }) => {
  const sizeClasses = {
    small: 'h-8 md:h-10',
    medium: 'h-12 md:h-16',
    large: 'h-16 md:h-20',
  };

  return (
    <div className="flex items-center justify-center">
      <img 
        src="/lovable-uploads/b29d5752-94e4-453d-8259-9bbe370370fd.png" 
        alt="Patient Hub by Dr. Porceban"
        className={`${sizeClasses[size]} w-auto`}
      />
    </div>
  );
};

export default Logo;

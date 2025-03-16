
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
        <img 
          src="/lovable-uploads/928027f7-2ed3-4bc7-bdd7-366cc08fbf87.png" 
          alt="Patient Hub logo"
          className={`h-${size === 'small' ? '8' : size === 'medium' ? '10' : '12'} w-auto`}
        />
      </div>
    </div>
  );
};

export default Logo;

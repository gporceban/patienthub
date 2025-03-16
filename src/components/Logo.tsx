
import React, { useEffect, useState } from 'react';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
}

const Logo: React.FC<LogoProps> = ({ size = 'medium' }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // Small delay before animation starts to ensure it runs after component mount
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  const sizeClasses = {
    small: 'h-10 md:h-12',
    medium: 'h-16 md:h-20',
    large: 'h-28 md:h-36 lg:h-40',
  };

  return (
    <div className="flex items-center justify-center relative">
      {/* Glowing effect behind logo */}
      <div 
        className={`absolute rounded-full bg-amber-400/10 blur-3xl 
          ${isVisible ? 'opacity-60 scale-100' : 'opacity-0 scale-50'} 
          transition-all duration-1000 ease-out`}
        style={{ 
          width: '140%', 
          height: '140%',
          zIndex: -1 
        }}
      />
      
      {/* Animated logo */}
      <img 
        src="/lovable-uploads/058d1a3a-0618-461f-a21b-3430a79eee43.png" 
        alt="Patient Hub by Dr. Porceban"
        className={`
          ${sizeClasses[size]} 
          w-auto 
          ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'} 
          transition-all duration-1000 ease-out
        `}
        style={{ 
          filter: 'drop-shadow(0 0 15px rgba(253, 207, 154, 0.45))'
        }}
      />
      
      {/* Golden particles effect */}
      <div className={`
        absolute inset-0 
        ${isVisible ? 'opacity-80' : 'opacity-0'} 
        transition-opacity duration-1500 delay-500
      `}>
        {[...Array(12)].map((_, i) => (
          <div 
            key={i}
            className="absolute rounded-full bg-amber-300/30"
            style={{
              width: Math.random() * 10 + 3,
              height: Math.random() * 10 + 3,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              filter: 'blur(1px)',
              animation: `float ${Math.random() * 5 + 3}s ease-in-out infinite alternate`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default Logo;

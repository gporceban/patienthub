
import React, { useEffect, useRef } from 'react';

const StarBackground: React.FC = () => {
  const starsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!starsRef.current) return;
    
    const starContainer = starsRef.current;
    starContainer.innerHTML = '';
    
    const numberOfStars = 100;
    
    for (let i = 0; i < numberOfStars; i++) {
      const star = document.createElement('div');
      star.classList.add('star');
      
      // Random positioning
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      
      // Random size (0.5px to 2px)
      const size = 0.5 + Math.random() * 1.5;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      
      // Random opacity and delay for twinkling
      star.style.opacity = `${0.3 + Math.random() * 0.7}`;
      star.style.animationDelay = `${Math.random() * 4}s`;
      
      starContainer.appendChild(star);
    }
  }, []);
  
  return <div ref={starsRef} className="stars"></div>;
};

export default StarBackground;

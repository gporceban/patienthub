
import React, { useEffect, useRef } from 'react';

const StarBackground: React.FC = () => {
  const starsRef = useRef<HTMLDivElement>(null);
  const horizonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!starsRef.current) return;
    
    const starContainer = starsRef.current;
    starContainer.innerHTML = '';
    
    const numberOfStars = 200;
    
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
      star.style.animationDelay = `${Math.random() * 6}s`;
      
      starContainer.appendChild(star);
    }

    // Add a radial gradient to create a glowing effect behind stars
    const glowEffect = document.createElement('div');
    glowEffect.style.position = 'absolute';
    glowEffect.style.top = '50%';
    glowEffect.style.left = '50%';
    glowEffect.style.transform = 'translate(-50%, -50%)';
    glowEffect.style.width = '500px';
    glowEffect.style.height = '500px';
    glowEffect.style.borderRadius = '50%';
    glowEffect.style.background = 'radial-gradient(circle, rgba(253,207,154,0.05) 0%, rgba(0,0,0,0) 70%)';
    glowEffect.style.zIndex = '-1';
    
    if (starContainer.parentNode) {
      starContainer.parentNode.appendChild(glowEffect);
    }
  }, []);
  
  return (
    <>
      <div ref={starsRef} className="stars"></div>
      <div ref={horizonRef} className="planet-horizon"></div>
    </>
  );
};

export default StarBackground;

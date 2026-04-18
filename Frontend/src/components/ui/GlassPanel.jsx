import React from 'react';

export default function GlassPanel({ children, className = '', style = {}, intensity = 'high' }) {
  // intensity allows slight variation in opacity for hierarchy based on depth rule
  const alpha = intensity === 'highest' ? 0.9 : intensity === 'high' ? 0.7 : 0.5;
  
  return (
    <div 
      className={`glass-panel ${className}`} 
      style={{ 
        background: `rgba(255, 255, 255, ${alpha})`,
        border: '1px solid var(--outline-variant)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        ...style 
      }}
    >
      {children}
    </div>
  );
}

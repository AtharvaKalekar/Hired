import React from 'react';
import { motion } from 'framer-motion';

export default function GlowingButton({ children, variant = 'primary', onClick, className = '', style = {}, type="button" }) {
  const isPrimary = variant === 'primary';
  
  const baseStyle = {
    padding: '12px 24px',
    borderRadius: '16px',
    fontFamily: 'Manrope, sans-serif',
    fontWeight: '600',
    fontSize: '15px',
    border: 'none',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    outline: 'none',
  };

  const primaryStyle = {
    background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)',
    color: 'var(--on-primary)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 8px 32px rgba(77, 142, 255, 0.15)',
  };
  
  const secondaryStyle = {
    background: 'transparent',
    color: 'var(--primary)',
    border: '1px solid var(--outline-variant)',
  };

  return (
    <motion.button
      type={type}
      whileHover={{ 
        scale: 1.02, 
        boxShadow: isPrimary 
          ? 'inset 0 1px 0 rgba(255,255,255,0.3), 0 12px 40px rgba(77, 142, 255, 0.25)' 
          : '0 4px 20px rgba(0, 0, 0, 0.05)'
      }}
      whileTap={{ scale: 0.98 }}
      style={{ ...baseStyle, ...(isPrimary ? primaryStyle : secondaryStyle), ...style }}
      className={className}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { X, Briefcase, Zap, Home, LayoutDashboard, MessageSquare, Plus, Activity, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import useIsMobile from '../../hooks/useIsMobile';

export default function Sidebar({ onClose }) {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navItems = [
    { name: 'Core Engine', path: '/', icon: Zap, section: 'System' },
    { name: 'Opportunity Hub', path: '/home', icon: Home, section: 'Discovery' },
    { name: 'Swipe Review', path: '/swipe', icon: Briefcase, section: 'Discovery' },
    { name: 'Career Copilot', path: '/copilot', icon: MessageSquare, section: 'Execution' },
    { name: 'Command Center', path: '/dashboard', icon: LayoutDashboard, section: 'Analytics' },
  ];

  const sections = ['System', 'Discovery', 'Execution', 'Analytics'];

  return (
    <nav style={{
      width: '260px',
      background: 'var(--surface)',
      borderRight: '1px solid var(--outline-variant)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingLeft: '8px', marginBottom: '32px', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px', height: '32px',
            background: 'var(--primary)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Briefcase size={16} color="var(--on-primary)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: '18px', lineHeight: 1.1, color: 'var(--primary)' }}>
              HIRED<span style={{ color: 'var(--secondary)' }}>.AI</span>
            </span>
            <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Workspace</span>
          </div>
        </div>

        {isMobile && (
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--on-surface-variant)',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
        {sections.map(sec => (
          <div key={sec} style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: '8px', marginBottom: '8px' }}>
              {sec}
            </div>
            {navItems.filter(i => i.section === sec).map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink 
                  key={item.path} 
                  to={item.path}
                  onClick={() => {
                    if (isMobile && onClose) onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    color: isActive ? 'var(--primary)' : 'var(--on-surface-variant)',
                    background: isActive ? 'var(--surface-container)' : 'transparent',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 500,
                    textDecoration: 'none',
                    transition: 'all 0.1s ease',
                    marginBottom: '4px'
                  }}
                >
                  <item.icon size={16} />
                  {item.name}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto', background: 'var(--surface-container-low)', padding: '16px', borderRadius: '12px', border: '1px solid var(--outline-variant)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
           <Activity size={16} color="var(--secondary)" />
           <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>System Metrics</span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>API Tokens</span>
          <span style={{ fontFamily: 'JetBrains Mono' }}>45.2k</span>
        </div>
        <div style={{ width: '100%', height: '4px', background: 'var(--surface-container-high)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: '68%', height: '100%', background: 'var(--secondary)' }} />
        </div>
      </div>
    </nav>
  );
}

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, Settings, Command, LogOut, Menu } from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';

export default function Header({ onMenuClick }) {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const pathParts = location.pathname.split('/').filter(Boolean);
  const currentPath = pathParts.length > 0 ? pathParts[0] : 'onboarding';

  const [showDropdown, setShowDropdown] = useState(false);
  const [initials, setInitials] = useState('U');
  const [userName, setUserName] = useState('User');

  useEffect(() => {
    try {
      const userInfoStr = localStorage.getItem('user_info');
      if (userInfoStr) {
        const userInfo = JSON.parse(userInfoStr);
        if (userInfo && userInfo.name) {
          setUserName(userInfo.name);
          const nameParts = userInfo.name.trim().split(' ');
          if (nameParts.length >= 2) {
             setInitials((nameParts[0][0] + nameParts[1][0]).toUpperCase());
          } else if (nameParts.length === 1 && nameParts[0].length >= 1) {
             setInitials(nameParts[0].substring(0, 2).toUpperCase());
          }
        }
      }
    } catch (e) {
      console.error('Failed to parse user_info from localStorage', e);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    navigate('/auth');
  };

  return (
    <header style={{
      height: '72px',
      background: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--outline-variant)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isMobile ? '0 16px' : '0 32px',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      
      {/* Breadcrumbs / Burger Menu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {isMobile && (
          <button 
            onClick={onMenuClick}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--primary)',
              padding: '8px',
              marginRight: '-4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Menu size={20} />
          </button>
        )}
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--on-surface-variant)' }}>
            <span style={{ fontWeight: 500 }}>Workspace</span>
            <span>/</span>
            <span style={{ color: 'var(--primary)', fontWeight: 600, textTransform: 'capitalize' }}>{currentPath}</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '24px' }}>
        {/* Global Search */}
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)' }}>
            <Search size={16} />
          </div>
          <input 
            type="text" 
            placeholder={isMobile ? "Search..." : "Search roles or companies..."}
            style={{
              width: isMobile ? '120px' : '280px',
              padding: '10px 12px 10px 36px',
              background: 'var(--surface-container)',
              border: '1px solid transparent',
              borderRadius: '8px',
              fontSize: '13px',
              fontFamily: 'Inter',
              color: 'var(--on-surface)',
              outline: 'none',
              transition: 'all 0.2s'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--outline-variant)';
              e.target.style.background = 'var(--surface)';
              e.target.style.boxShadow = '0 0 0 3px rgba(196, 139, 87, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'transparent';
              e.target.style.background = 'var(--surface-container)';
              e.target.style.boxShadow = 'none';
            }}
          />
          {!isMobile && (
            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)', fontSize: '11px', display: 'flex', gap: '4px', alignItems: 'center', background: 'var(--surface-container-high)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'JetBrains Mono' }}>
               <Command size={10} /> K
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '16px', color: 'var(--on-surface-variant)' }}>
          <Bell size={18} style={{ cursor: 'pointer' }} />
          {!isMobile && <Settings size={18} style={{ cursor: 'pointer' }} />}
          {!isMobile && <div style={{ width: '1px', height: '24px', background: 'var(--outline-variant)' }} />}
          
          <div style={{ position: 'relative' }}>
            <div 
              style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'var(--primary-container)',
                border: '1px solid var(--outline-variant)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
              }}
              onClick={() => setShowDropdown(!showDropdown)}
              title={userName}
            >
              <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '13px' }}>{initials}</span>
            </div>
            
            {showDropdown && (
              <>
                <div 
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9 }} 
                  onClick={() => setShowDropdown(false)} 
                />
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  background: 'var(--surface)', border: '1px solid var(--outline-variant)',
                  borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  minWidth: '160px', zIndex: 10, padding: '8px 0',
                  display: 'flex', flexDirection: 'column'
                }}>
                  <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--outline-variant)', marginBottom: '4px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)' }}>{userName}</div>
                  </div>
                  <button 
                    onClick={handleLogout}
                    style={{
                      background: 'none', border: 'none', width: '100%',
                      padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px',
                      color: '#ef4444', fontSize: '13px', cursor: 'pointer', textAlign: 'left'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--surface-container)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    <LogOut size={14} /> Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

    </header>
  );
}

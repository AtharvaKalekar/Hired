import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Github, Linkedin, ArrowRight, Activity, Terminal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlowingButton from '../components/ui/GlowingButton';
import useIsMobile from '../hooks/useIsMobile';

const InputField = ({ label, type = "text", placeholder, value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)' }}>{label}</label>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={{
        width: '100%',
        padding: '12px 16px',
        background: 'var(--surface-container)',
        border: '1px solid var(--outline-variant)',
        borderRadius: '8px',
        color: 'var(--on-surface)',
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px',
        outline: 'none',
        transition: 'all 0.2s',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
      }}
      onFocus={(e) => {
        e.target.style.borderColor = 'var(--secondary)';
        e.target.style.background = 'var(--surface)';
        e.target.style.boxShadow = '0 0 0 3px rgba(196, 139, 87, 0.1)';
      }}
      onBlur={(e) => {
        e.target.style.borderColor = 'var(--outline-variant)';
        e.target.style.background = 'var(--surface-container)';
        e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.02)';
      }}
    />
  </div>
);

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
      const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${endpoint}`;

      const payload = isLogin ? { email, password } : { name, email, password };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      // Store token securely (localStorage for now)
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_info', JSON.stringify({ _id: data._id, name: data.name, email: data.email }));

      navigate('/onboarding');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* Functional Side (Left) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: isMobile ? '24px 20px' : '40px 48px', position: 'relative', zIndex: 10, background: 'var(--surface)' }}>
        <div
          onClick={() => navigate('/')}
          style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.02em', color: 'var(--primary)', cursor: 'pointer', display: 'inline-block' }}
        >
          HIRED<span style={{ color: 'var(--secondary)' }}>.AI</span>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '440px', margin: '0 auto', width: '100%' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? 'login' : 'signup'}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h1 style={{ fontSize: '36px', marginBottom: '8px', color: 'var(--primary)' }}>
                {isLogin ? 'Welcome Back.' : 'Initialize Protocol.'}
              </h1>
              <p style={{ fontSize: '15px', color: 'var(--on-surface-variant)', marginBottom: '32px', lineHeight: 1.6 }}>
                {isLogin ? 'Authenticate to resume autonomous career discovery.' : 'Enter your parameters to begin generating your agent profile.'}
              </p>

              {/* OAuth Buttons */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
                <button style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--outline-variant)', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: 'var(--on-surface)', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
                  onMouseEnter={(e) => e.target.style.background = 'var(--surface-container)'}
                  onMouseLeave={(e) => e.target.style.background = 'var(--surface)'}
                >
                  <Github size={18} /> GitHub
                </button>
                <button style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid #0077B5', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#0077B5', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(0,119,181,0.05)'}
                  onMouseLeave={(e) => e.target.style.background = 'var(--surface)'}
                >
                  <Linkedin size={18} /> LinkedIn
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--outline-variant)' }} />
                <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Or proceed manually</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--outline-variant)' }} />
              </div>

              {error && (
                <div style={{ padding: '12px', marginBottom: '20px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '14px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleAuth}>
                {!isLogin && <InputField label="Full Designation" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />}
                <InputField label="System Email" type="email" placeholder="john.doe@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                <InputField label="Access Token (Password)" type="password" placeholder="••••••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />

                <GlowingButton type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '14px', marginTop: '16px', fontSize: '14px', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Processing...' : (isLogin ? 'Complete Authentication' : 'Provision Workspace')} <ArrowRight size={16} style={{ marginLeft: '4px' }} />
                </GlowingButton>
              </form>

              <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '14px', color: 'var(--on-surface-variant)' }}>
                {isLogin ? "Don't have an active workspace? " : "Already initialized? "}
                <span
                  onClick={() => setIsLogin(!isLogin)}
                  style={{ color: 'var(--secondary)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {isLogin ? 'Initialize Now' : 'Authenticate Here'}
                </span>
              </div>

            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Ambient Side (Right) - Deep Espresso Contrast */}
      <div style={{ flex: 1, position: 'relative', background: '#2D241E', borderLeft: '1px solid var(--outline-variant)', overflow: 'hidden', display: isMobile ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

        {/* Dynamic Auras */}
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{ position: 'absolute', width: '80vh', height: '80vh', borderRadius: '50%', background: 'var(--secondary)', filter: 'blur(120px)', opacity: 0.15 }}
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], rotate: [0, -90, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          style={{ position: 'absolute', width: '60vh', height: '60vh', borderRadius: '50%', background: '#10B981', filter: 'blur(120px)', opacity: 0.08, top: '10%', right: '10%' }}
        />

        {/* System Readout Overlay */}
        <div style={{ position: 'relative', zIndex: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(45, 36, 30, 0.4)', backdropFilter: 'blur(20px)', padding: '32px', borderRadius: '16px', color: '#EAE3D9', width: '400px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <Terminal size={20} color="var(--secondary)" />
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', fontWeight: 500, letterSpacing: '0.05em' }}>SYSTEM_STATUS: NOMINAL</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: 'Inter', fontSize: '14px', lineHeight: 1.6 }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <Activity size={16} color="#10B981" style={{ marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: 600, color: '#FFFFFF' }}>Neural Match Models Online</div>
                <div style={{ opacity: 0.7, fontSize: '13px' }}>Awaiting user vectors for JD alignment processing.</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <Activity size={16} color="#10B981" style={{ marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: 600, color: '#FFFFFF' }}>Automated Dispatch Ready</div>
                <div style={{ opacity: 0.7, fontSize: '13px' }}>Workday and Lever headless browsers standing by.</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

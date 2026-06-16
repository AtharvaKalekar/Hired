import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Sparkles, Terminal, Activity, Layers, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import useIsMobile from '../hooks/useIsMobile';

const FadeIn = ({ children, delay = 0, y = 20, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

export default function LandingPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <div style={{ background: 'var(--surface-container-low)', minHeight: '100vh', overflowX: 'hidden', color: 'var(--on-surface)' }}>
      
      {/* Navigation Bar */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isMobile ? '16px 20px' : '24px 48px', position: 'absolute', width: '100%', top: 0, zIndex: 50 }}>
        <div style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.02em', color: 'var(--primary)' }}>
          HIRED<span style={{ color: 'var(--secondary)' }}>.AI</span>
        </div>
        <div style={{ display: isMobile ? 'none' : 'flex', gap: '32px', fontSize: '13px', fontWeight: 500, color: 'var(--on-surface-variant)' }}>
          <span style={{ cursor: 'pointer' }}>Platform</span>
          <span style={{ cursor: 'pointer' }}>Algorithms</span>
          <span style={{ cursor: 'pointer' }}>Enterprise</span>
        </div>
        <button 
          onClick={() => navigate('/auth')}
          style={{ background: 'var(--primary)', color: 'var(--on-primary)', border: 'none', padding: isMobile ? '8px 16px' : '10px 24px', borderRadius: '40px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Initialize <ArrowRight size={14} />
        </button>
      </nav>

      {/* Background Auras */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'var(--surface-container-highest)', filter: 'blur(100px)', opacity: 0.5, borderRadius: '50%', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: '20%', right: '-5%', width: '40vw', height: '40vw', background: 'var(--secondary)', filter: 'blur(140px)', opacity: 0.08, borderRadius: '50%', zIndex: 0 }} />

      {/* Hero Section */}
      <section style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: isMobile ? '120px 16px 60px' : '20vh 24px 16vh' }}>
        <FadeIn delay={0.1}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', border: '1px solid var(--outline-variant)', borderRadius: '40px', padding: '6px 16px', fontSize: '12px', fontWeight: 600, color: 'var(--secondary)', marginBottom: '32px', background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(8px)' }}>
            <Sparkles size={14} /> Automating Senior-Level Placements
          </div>
        </FadeIn>
        
        <FadeIn delay={0.2}>
          <h1 style={{ fontFamily: 'Manrope', fontSize: 'clamp(48px, 6vw, 88px)', lineHeight: 0.95, letterSpacing: '-0.04em', color: 'var(--primary)', maxWidth: '900px', margin: '0 auto 24px' }}>
            The Intelligent Career Protocol.
          </h1>
        </FadeIn>
        
        <FadeIn delay={0.3}>
          <p style={{ fontSize: '18px', color: 'var(--on-surface-variant)', maxWidth: '580px', margin: '0 auto 48px', lineHeight: 1.6 }}>
            Delegate your career search to an autonomous agent. From vector-based ATS matching to direct Workday submissions, we automate high-leverage opportunity discovery.
          </p>
        </FadeIn>

        <FadeIn delay={0.4}>
          <button 
            onClick={() => navigate('/auth')}
            style={{ 
              background: 'var(--primary)', color: 'var(--on-primary)', border: 'none', 
              padding: '16px 40px', borderRadius: '40px', fontSize: '15px', fontWeight: 600, 
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
              boxShadow: '0 12px 32px rgba(74, 59, 50, 0.15)'
            }}
          >
            Access Workspace <ChevronRight size={18} />
          </button>
        </FadeIn>
      </section>

      {/* Bento Box Showcase */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '0 16px 8vh' : '0 24px 16vh' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '24px' }}>
          
          {/* Main Feature */}
          <FadeIn delay={0.1}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--outline-variant)', borderRadius: '24px', padding: isMobile ? '24px' : '48px', height: '100%', position: 'relative', overflow: 'hidden' }}>
              <Terminal size={32} color="var(--primary)" style={{ marginBottom: '24px' }} />
              <h3 style={{ fontSize: isMobile ? '22px' : '28px', color: 'var(--primary)', marginBottom: '16px' }}>Terminal-Grade Parsing</h3>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '15px', lineHeight: 1.6, maxWidth: '400px' }}>
                Our ingestion engine parses your GitHub commits, architecture designs, and LeetCode velocity to construct an absolute source of truth for your competencies, fully bypassing manual data entry.
              </p>
              
              {!isMobile && (
                <div style={{ position: 'absolute', bottom: '-40px', right: '-40px', background: 'var(--surface-container)', padding: '24px', borderRadius: '16px', border: '1px solid var(--surface-container-high)', width: '300px' }}>
                   <div style={{ fontSize: '11px', fontFamily: 'JetBrains Mono', color: 'var(--on-surface-variant)', marginBottom: '8px' }}>~/extract/github</div>
                   <div style={{ fontSize: '13px', fontFamily: 'JetBrains Mono', color: 'var(--primary)' }}>Analyzing 412 commits...</div>
                   <div style={{ fontSize: '13px', fontFamily: 'JetBrains Mono', color: '#10B981' }}>Found: GraphQL, Next.js, Redux</div>
                </div>
              )}
            </div>
          </FadeIn>

          {/* Side Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <FadeIn delay={0.2} style={{ flex: 1 }}>
              <div style={{ background: 'var(--surface-container-high)', borderRadius: '24px', padding: '32px', height: '100%' }}>
                <Activity size={24} color="var(--secondary)" style={{ marginBottom: '16px' }} />
                <h4 style={{ fontSize: '20px', color: 'var(--primary)', marginBottom: '8px' }}>ATS Match Algorithms</h4>
                <p style={{ color: 'var(--on-surface-variant)', fontSize: '14px', lineHeight: 1.5 }}>
                  We don't just show you jobs. We generate multidimensional vector analyses comparing your raw skills against extracted JD tokens.
                </p>
              </div>
            </FadeIn>
            
            <FadeIn delay={0.3} style={{ flex: 1 }}>
              <div style={{ background: 'var(--primary)', color: 'var(--on-primary)', borderRadius: '24px', padding: '32px', height: '100%' }}>
                <Layers size={24} color="var(--secondary)" style={{ marginBottom: '16px' }} />
                <h4 style={{ fontSize: '20px', color: 'var(--on-primary)', marginBottom: '8px' }}>Autonomous Dispatch</h4>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: 1.5 }}>
                  Once you approve a dossier, our agent utilizes encrypted credentials to autonomously fill Workday and Greenhouse portals.
                </p>
              </div>
            </FadeIn>
          </div>

        </div>
      </section>

      {/* Social Proof */}
      <section style={{ borderTop: '1px solid var(--outline-variant)', borderBottom: '1px solid var(--outline-variant)', padding: isMobile ? '40px 16px' : '12vh 24px', background: 'var(--surface)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'flex-start', textAlign: isMobile ? 'center' : 'left', flexWrap: 'wrap', gap: isMobile ? '32px' : '48px' }}>
          <FadeIn delay={0.1}>
            <div style={{ fontSize: isMobile ? '36px' : '48px', fontFamily: 'Manrope', fontWeight: 800, color: 'var(--primary)', marginBottom: '8px' }}>$180k+</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg. Target Compensation</div>
          </FadeIn>
          <FadeIn delay={0.2}>
            <div style={{ fontSize: isMobile ? '36px' : '48px', fontFamily: 'Manrope', fontWeight: 800, color: 'var(--primary)', marginBottom: '8px' }}>14,203</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Automated Applications</div>
          </FadeIn>
          <FadeIn delay={0.3}>
            <div style={{ fontSize: isMobile ? '36px' : '48px', fontFamily: 'Manrope', fontWeight: 800, color: 'var(--primary)', marginBottom: '8px' }}>8.4%</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Interview Conversion Rate</div>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: '13px' }}>
        <div style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: '18px', color: 'var(--primary)', marginBottom: '16px' }}>
          HIRED<span style={{ color: 'var(--secondary)' }}>.AI</span>
        </div>
        <p>© 2026 Intelligent Career Solutions. Designed autonomously.</p>
      </footer>

    </div>
  );
}

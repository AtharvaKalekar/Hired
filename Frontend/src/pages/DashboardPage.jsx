import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Lock, Eye, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import GlassPanel from '../components/ui/GlassPanel';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('Tracking');

  const StatBox = ({ title, value, subtext }) => (
    <div style={{ padding: '24px', background: 'var(--surface)', border: '1px solid var(--outline-variant)', borderRadius: '12px', flex: 1 }}>
      <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--on-surface-variant)', letterSpacing: '0.05em', marginBottom: '8px' }}>{title}</div>
      <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'Manrope', color: 'var(--primary)', marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: 600 }}>{subtext}</div>
    </div>
  );

  const StatusPill = ({ label, color }) => (
    <span style={{ padding: '4px 8px', borderRadius: '4px', background: `color-mix(in srgb, ${color} 10%, transparent)`, color: color, fontSize: '11px', fontWeight: 600, border: `1px solid color-mix(in srgb, ${color} 20%, transparent)` }}>
      {label}
    </span>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Top Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
           <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Analytics & Vault</h1>
           <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)' }}>Monitor agent throughput and manage encrypted credentials.</p>
        </div>
        
        <div style={{ display: 'flex', background: 'var(--surface-container-high)', padding: '6px', borderRadius: '8px', border: '1px solid var(--outline-variant)' }}>
          {['Tracking', 'Security Vault'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                 background: activeTab === tab ? 'var(--surface)' : 'transparent',
                 color: activeTab === tab ? 'var(--primary)' : 'var(--on-surface-variant)',
                 border: 'none', padding: '8px 24px', borderRadius: '6px', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                 boxShadow: activeTab === tab ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'Tracking' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Top Level Metrics */}
          <div style={{ display: 'flex', gap: '24px' }}>
            <StatBox title="Active Pipelines" value="142" subtext="+12 this week from Agent" />
            <StatBox title="Interview Conversions" value="12" subtext="8.4% success rate via AI Resumes" />
            <StatBox title="Auto-Applies Completed" value="89" subtext="Saved approx. 21 hours" />
          </div>

          {/* Complex Table Data */}
          <GlassPanel intensity="low" style={{ padding: '0', overflow: 'hidden' }}>
             <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--outline-variant)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <BarChart3 size={16} color="var(--primary)" />
               <span style={{ fontSize: '14px', fontWeight: 600 }}>Active Application Ledger</span>
             </div>

             <div style={{ width: '100%', overflowX: 'auto' }}>
               <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                 <thead>
                   <tr style={{ background: 'var(--surface-container-low)', color: 'var(--on-surface-variant)' }}>
                     <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Company / Role</th>
                     <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Pipeline Stage</th>
                     <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Last Agent Action</th>
                     <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Next Step</th>
                   </tr>
                 </thead>
                 <tbody>
                   {[
                     { com: 'Stripe', role: 'Staff Engineer', stage: 'Technical Screen', action: 'Drafted follow-up email', next: 'Prep Interview Doc', color: '#3B82F6' },
                     { com: 'Airbnb', role: 'Lead Architect', stage: 'Auto-Applied', action: 'Submitted via Greenhouse', next: 'Monitor Inbox', color: '#10B981' },
                     { com: 'Square', role: 'Senior Engineer', stage: 'Referral Pending', action: 'Emailed John Doe for Intro', next: 'Wait 3 Days', color: 'var(--tertiary)' },
                     { com: 'Netflix', role: 'Backend Engineer', stage: 'Ghosted', action: 'Sent 2nd follow-up', next: 'Archive in 48h', color: 'var(--on-surface-variant)' }
                   ].map((row, i) => (
                     <tr key={i} style={{ borderBottom: '1px solid var(--outline-variant)', background: 'var(--surface)' }}>
                       <td style={{ padding: '16px 24px' }}>
                         <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{row.com}</div>
                         <div style={{ color: 'var(--on-surface-variant)', fontSize: '12px' }}>{row.role}</div>
                       </td>
                       <td style={{ padding: '16px 24px' }}><StatusPill label={row.stage} color={row.color} /></td>
                       <td style={{ padding: '16px 24px', color: 'var(--on-surface-variant)' }}>{row.action}</td>
                       <td style={{ padding: '16px 24px', fontFamily: 'JetBrains Mono', fontSize: '12px' }}>{row.next}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </GlassPanel>

        </motion.div>
      )}

      {activeTab === 'Security Vault' && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
           <GlassPanel intensity="highest" style={{ padding: '40px', background: 'var(--surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <Lock size={24} color="var(--tertiary)" />
                <h2 style={{ fontSize: '24px' }}>Credential Encryption</h2>
              </div>
              <p style={{ color: 'var(--on-surface-variant)', marginBottom: '40px', maxWidth: '600px', lineHeight: 1.6, fontSize: '14px' }}>
                The agent securely utilizes these endpoints to automate multi-page Workday/Greenhouse applications without manual intervention. Data is encrypted client-side.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                {[
                  { site: 'Workday Interfacing', user: 'ritesh@hired.ai' },
                  { site: 'Greenhouse Portals', user: 'ritesh@hired.ai' },
                  { site: 'Lever System', user: 'ritesh.jadhav@gmail.com' },
                  { site: 'Ashby Automations', user: 'ritesh@hired.ai' }
                ].map((cred, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', background: 'var(--surface-container-low)', borderRadius: '8px', border: '1px solid var(--outline-variant)' }}>
                    <div>
                      <h4 style={{ fontSize: '14px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>{cred.site}</h4>
                      <div style={{ fontSize: '13px', color: 'var(--on-surface-variant)', fontFamily: 'JetBrains Mono' }}>{cred.user}</div>
                    </div>
                    <button style={{ background: 'none', border: '1px solid var(--outline-variant)', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', color: 'var(--on-surface-variant)', background: 'var(--surface)' }}>
                      <Eye size={14} />
                    </button>
                  </div>
                ))}
              </div>
           </GlassPanel>
        </motion.div>
      )}

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Github, Linkedin, Code2, Link2, Sparkles, Terminal, CheckCircle2, UploadCloud } from 'lucide-react';
import GlassPanel from '../components/ui/GlassPanel';
import GlowingButton from '../components/ui/GlowingButton';
import { useNavigate } from 'react-router-dom';

export default function OnboardingPage() {
  const [analyzing, setAnalyzing] = useState(false);
  const [complete, setComplete] = useState(false);
  const [logs, setLogs] = useState([]);
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [leetcodeUrl, setLeetcodeUrl] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const mockLogs = [
    { time: '0.0s', text: '[Agent] Initializing extraction subroutines...', duration: 500 },
    { time: '0.5s', text: '[Parser] Linking GitHub: riteshjadhav283...', duration: 800 },
    { time: '1.3s', text: '[Analysis] Detected 432 commits. Primary: React, Node, Python.', duration: 1200 },
    { time: '2.5s', text: '[Parser] Pulling LinkedIn endorsements...', duration: 900 },
    { time: '3.4s', text: '[Compiler] Synthesizing core competencies into abstract syntax tree.', duration: 1500 },
    { time: '4.9s', text: '[Agent] Generating tailored resume permutations...', duration: 1000 },
    { time: '5.9s', text: '[System] Profile successfully constructed. Unlocking Hub.', duration: 500 }
  ];

  // Real API Execution
  const executeExtraction = async () => {
    if (!githubUrl) {
      setErrorMsg('GitHub URL is minimally required for agent parsing.');
      return;
    }
    
    setErrorMsg('');
    setAnalyzing(true);
    setLogs([{ time: '0.0s', text: '[Agent] Initializing extraction subroutines...', duration: 500 }]);

    try {
      // Simulate frontend log output while backend works natively
      const synthInterval = setInterval(() => {
        setLogs(prev => [...prev, { time: `${(prev.length * 1.2).toFixed(1)}s`, text: '[Compiler] Synthesizing competencies & polling models...', duration: 500 }]);
      }, 5000);

      const userInfo = JSON.parse(localStorage.getItem('user_info')) || {};
      
      const formData = new FormData();
      formData.append('userId', userInfo._id);
      formData.append('githubUrl', githubUrl);
      formData.append('linkedinUrl', linkedinUrl);
      formData.append('leetcodeUrl', leetcodeUrl);
      if (resumeFile) {
        formData.append('resumePdf', resumeFile);
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/profile/generate-cv`, {
        method: 'POST',
        body: formData // No Content-Type header so browser boundary adds automatically
      });

      clearInterval(synthInterval);

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Engine failed to synthesize profile.');
      }

      if (data.data && data.data.latex) {
          localStorage.setItem('temp_latex', data.data.latex);
      }

      // Success
      setLogs(prev => [...prev, { time: 'READY', text: '[System] LaTeX Profile successfully constructed in Database.', duration: 0 }]);
      setAnalyzing(false);
      setComplete(true);

    } catch (error) {
      setAnalyzing(false);
      setErrorMsg(error.message);
      setLogs(prev => [...prev, { time: 'ERROR', text: `[System Failure] ${error.message}`, duration: 0 }]);
    }
  };

  const InputRow = ({ icon: Icon, placeholder, type = 'text', value, onChange }) => (
    <div style={{ position: 'relative', marginBottom: '16px' }}>
      <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)' }}>
        <Icon size={16} />
      </div>
      <input 
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={{
          width: '100%',
          padding: '12px 16px 12px 42px',
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

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'center', minHeight: 'calc(100vh - 120px)' }}>
      
      {/* Left Column: Form */}
      <div>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--secondary)', fontWeight: 700, marginBottom: '24px', fontSize: '12px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            <Sparkles size={14} /> Extraction Engine
          </div>
          <h1 style={{ fontSize: '48px', lineHeight: '1.1', marginBottom: '16px', color: 'var(--primary)' }}>
            Systematic Career Synthesis.
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--on-surface-variant)', lineHeight: '1.6', marginBottom: '32px' }}>
            Connect your primary repos and endpoints. The AI engine will parse your architecture, commits, and networking history to generate a comprehensive, ATS-optimized profile.
          </p>

          <GlassPanel style={{ padding: '32px' }}>
            <InputRow icon={Github} placeholder="GitHub URL" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} />
            <InputRow icon={Linkedin} placeholder="LinkedIn URL" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
            <InputRow icon={Code2} placeholder="LeetCode URL" value={leetcodeUrl} onChange={(e) => setLeetcodeUrl(e.target.value)} />
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <div style={{
                width: '100%',
                padding: '16px',
                background: 'var(--surface-container)',
                border: '1px dashed var(--outline-variant)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--secondary)';
                e.currentTarget.style.background = 'var(--surface)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--outline-variant)';
                e.currentTarget.style.background = 'var(--surface-container)';
              }}>
                <UploadCloud size={24} color={resumeFile ? "#10B981" : "var(--primary)"} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: resumeFile ? '#10B981' : 'var(--on-surface)' }}>
                    {resumeFile ? resumeFile.name : 'Upload Resume (PDF/DOCX)'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                    {resumeFile ? `${(resumeFile.size / 1024 / 1024).toFixed(2)} MB attached` : 'Drag and drop or click to browse'}
                  </span>
                </div>
                <input 
                  type="file" 
                  accept=".pdf,.doc,.docx" 
                  onChange={(e) => setResumeFile(e.target.files[0])}
                  style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', top: 0, left: 0 }} 
                />
              </div>
            </div>
            
            {errorMsg && (
                <div style={{ padding: '12px', marginBottom: '16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '13px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  {errorMsg}
                </div>
            )}

            <div style={{ marginTop: '24px', borderTop: '1px solid var(--outline-variant)', paddingTop: '24px' }}>
              <GlowingButton onClick={executeExtraction} style={{ width: '100%', justifyContent: 'center' }} disabled={analyzing || complete}>
                {analyzing ? 'Engaging Parsers (approx. 30s)...' : complete ? 'Synthesis Complete' : 'Execute Extraction'}
              </GlowingButton>
            </div>
          </GlassPanel>
        </motion.div>
      </div>

      {/* Right Column: Terminal */}
      <div>
        <GlassPanel intensity="highest" style={{ height: '480px', display: 'flex', flexDirection: 'column', background: 'var(--surface)', padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: 'var(--surface-container-high)', borderBottom: '1px solid var(--outline-variant)', display: 'flex', alignItems: 'center', gap: '12px' }}>
             <Terminal size={16} color="var(--on-surface-variant)" />
             <span style={{ fontSize: '12px', fontFamily: 'JetBrains Mono', color: 'var(--on-surface-variant)' }}>agent-terminal ~/synthesis</span>
          </div>
          
          <div style={{ padding: '24px', flex: 1, fontFamily: 'JetBrains Mono', fontSize: '13px', lineHeight: 1.6, overflowY: 'auto', background: '#FDFDFD' }}>
            {!analyzing && !complete && (
              <div style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>Waiting for execution command...</div>
            )}
            
            {logs.map((log, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                <span style={{ color: 'var(--secondary)', marginRight: '12px' }}>{log.time}</span>
                <span style={{ color: log.text.includes('Success') || log.text.includes('Constructed') ? '#10B981' : 'var(--on-surface)' }}>{log.text}</span>
              </motion.div>
            ))}

            {complete && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ marginTop: '32px', padding: '24px', border: '1px solid #10B981', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                 <CheckCircle2 color="#10B981" size={32} style={{ marginBottom: '12px' }} />
                 <div style={{ fontWeight: 600, color: '#065F46', marginBottom: '16px' }}>PROFILE CONSTRUCTED</div>
                 <GlowingButton variant="secondary" onClick={() => navigate('/profile-review')}>Review Compiled CV</GlowingButton>
              </motion.div>
            )}
          </div>
        </GlassPanel>
      </div>

    </div>
  );
}

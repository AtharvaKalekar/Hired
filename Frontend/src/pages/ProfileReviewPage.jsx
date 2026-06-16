import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronDown, MonitorPlay, Save, Code, RefreshCw } from 'lucide-react';
import GlowingButton from '../components/ui/GlowingButton';
import useIsMobile from '../hooks/useIsMobile';

export default function ProfileReviewPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('preview');
  const [latexCode, setLatexCode] = useState('');
  const [pdfBase64, setPdfBase64] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    // Load initial latex from local storage
    const storedLatex = localStorage.getItem('temp_latex') || '\\documentclass{article}\n\\begin{document}\nHello World Resume.\n\\end{document}';
    setLatexCode(storedLatex);
    // Initial compile
    compileLatexReq(storedLatex);
  }, []);

  const compileLatexReq = async (codeToCompile) => {
    setIsCompiling(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/profile/compile-latex`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latexCode: codeToCompile })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Compilation failed');
      
      if (data.success && data.pdfBase64) {
        setPdfBase64(data.pdfBase64);
      }
    } catch (error) {
      console.error(error);
      setErrorMsg(error.message);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleLatexChange = (e) => {
    const newCode = e.target.value;
    setLatexCode(newCode);

    // Debounce compiled requests
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      compileLatexReq(newCode);
    }, 1500); // 1.5s debounce
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      const userInfo = JSON.parse(localStorage.getItem('user_info')) || {};
      
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/profile/confirm-resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userInfo._id, finalLatex: latexCode })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      localStorage.removeItem('temp_latex'); // Cleanup
      navigate('/home'); // Send to opportunity hub
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to confirm resume: ' + err.message);
      setIsConfirming(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '16px' : '0', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '20px' : '24px', color: 'var(--primary)', marginBottom: '8px' }}>Resume Compilation Engine</h1>
          <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>Fine-tune your generated LaTeX code and preview the PDF in real-time.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', width: isMobile ? '100%' : 'auto' }}>
           <GlowingButton 
             variant="secondary" 
             onClick={() => compileLatexReq(latexCode)}
             disabled={isCompiling}
             style={{ flex: isMobile ? 1 : 'none', fontSize: isMobile ? '12px' : '14px', padding: isMobile ? '8px 12px' : '12px 24px' }}
           >
             <RefreshCw size={16} style={{ marginRight: '8px' }} className={isCompiling ? 'spinner' : ''} />
             {isCompiling ? 'Compiling...' : 'Force Recompile'}
           </GlowingButton>
           
           <GlowingButton onClick={handleConfirm} disabled={isCompiling || isConfirming || !pdfBase64} style={{ background: '#10B981', color: 'white', flex: isMobile ? 1 : 'none', fontSize: isMobile ? '12px' : '14px', padding: isMobile ? '8px 12px' : '12px 24px' }}>
             <CheckCircle2 size={16} style={{ marginRight: '8px' }}/> 
             {isConfirming ? 'Processing...' : 'Confirm & Build'}
           </GlowingButton>
        </div>
      </div>

      {errorMsg && (
        <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: '8px', fontSize: '13px' }}>
          <strong>Compilation Error:</strong> {errorMsg}
        </div>
      )}

      {/* Mobile Workspace Tabs Toggle */}
      {isMobile && (
        <div style={{ display: 'flex', background: 'var(--surface-container-high)', padding: '4px', borderRadius: '8px', border: '1px solid var(--outline-variant)', marginBottom: '4px' }}>
          {['preview', 'source'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveWorkspaceTab(tab)}
              style={{
                flex: 1,
                background: activeWorkspaceTab === tab ? 'var(--surface)' : 'transparent',
                color: activeWorkspaceTab === tab ? 'var(--primary)' : 'var(--on-surface-variant)',
                border: 'none', padding: '8px 0', borderRadius: '6px', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                boxShadow: activeWorkspaceTab === tab ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              {tab === 'preview' ? 'Live Render (PDF)' : 'LaTeX Source'}
            </button>
          ))}
        </div>
      )}

      {/* Split Screen Workspace */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(400px, 1fr) minmax(400px, 1fr)', gap: '24px', height: isMobile ? 'calc(100vh - 280px)' : 'calc(100vh - 180px)' }}>
        
        {/* Left Side: PDF Preview */}
        {(!isMobile || activeWorkspaceTab === 'preview') && (
          <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--surface)', border: '1px solid var(--outline-variant)', borderRadius: '12px', overflow: 'hidden' }}>
             <div style={{ padding: '12px 16px', background: 'var(--surface-container-high)', borderBottom: '1px solid var(--outline-variant)', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <MonitorPlay size={16} color="var(--primary)" />
               <span style={{ fontSize: '13px', fontWeight: 600 }}>Live Render (PDF)</span>
               {isCompiling && <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--secondary)' }}>Rendering Core...</span>}
             </div>
             <div style={{ flex: 1, background: '#525659', position: 'relative' }}>
               {pdfBase64 ? (
                  <iframe 
                    src={`data:application/pdf;base64,${pdfBase64}#toolbar=0`} 
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title="PDF Preview"
                  />
               ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'white', opacity: 0.5, fontSize: '14px' }}>
                     {isCompiling ? 'Awaiting TeX Engine...' : 'No preview available.'}
                  </div>
               )}
             </div>
          </div>
        )}

        {/* Right Side: Code Editor */}
        {(!isMobile || activeWorkspaceTab === 'source') && (
          <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--surface)', border: '1px solid var(--outline-variant)', borderRadius: '12px', overflow: 'hidden' }}>
             <div style={{ padding: '12px 16px', background: 'var(--surface-container-high)', borderBottom: '1px solid var(--outline-variant)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <Code size={16} color="var(--primary)" />
                 <span style={{ fontSize: '13px', fontWeight: 600 }}>LaTeX Source</span>
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--on-surface-variant)', background: 'var(--surface)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--outline-variant)' }}>
                 Template: Default <ChevronDown size={14} />
               </div>
             </div>
             <textarea 
               value={latexCode}
               onChange={handleLatexChange}
               spellCheck="false"
               style={{
                 flex: 1,
                 width: '100%',
                 padding: '24px',
                 background: '#1E1E1E',
                 color: '#D4D4D4',
                 fontFamily: 'JetBrains Mono, monospace',
                 fontSize: '13px',
                 lineHeight: 1.6,
                 border: 'none',
                 outline: 'none',
                 resize: 'none',
               }}
             />
          </div>
        )}

      </div>
    
      {/* CSS For spinner */}
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spinner { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}

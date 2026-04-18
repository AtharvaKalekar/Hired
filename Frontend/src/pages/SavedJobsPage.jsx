import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, MapPin, DollarSign, ExternalLink, ArrowLeft, Bookmark, Sparkles, X, Copy, Check, FileText, Mail, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SavedJobsPage() {
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyingJobIdx, setApplyingJobIdx] = useState(null);
  const [applicationModal, setApplicationModal] = useState(null); // { tailoredCv, coverLetter, jobUrl, jobTitle }
  const [copiedField, setCopiedField] = useState(null);
  const navigate = useNavigate();

  const userInfo = JSON.parse(localStorage.getItem('user_info')) || {};
  const userId = userInfo._id;

  useEffect(() => {
    const fetchSaved = async () => {
      if (!userId) return;
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
        const res = await fetch(`${API_URL}/api/jobs/saved/${userId}`);
        const data = await res.json();
        if (data.success) {
          setSavedJobs(data.savedJobs);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSaved();
  }, [userId]);

  const handleApply = async (job, idx) => {
    setApplyingJobIdx(idx);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const res = await fetch(`${API_URL}/api/jobs/apply/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job })
      });
      const data = await res.json();
      if (data.success) {
        setApplicationModal({
          tailoredCv: data.tailoredCv,
          coverLetter: data.coverLetter,
          jobUrl: data.jobUrl,
          jobTitle: job.role,
          company: job.company,
          pdfBase64: data.pdfBase64,
          botResult: data.botResult
        });
      } else {
        alert('Application generation failed: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to connect to AI engine.');
    } finally {
      setApplyingJobIdx(null);
    }
  };

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', height: 'calc(100vh - 80px)', overflowY: 'auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <button onClick={() => navigate('/swipe')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer', padding: 0, marginBottom: '16px', fontSize: '14px', fontWeight: 600 }}>
            <ArrowLeft size={16} /> Back to Discovery
          </button>
          <h1 style={{ fontSize: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Bookmark color="var(--primary)" /> Portfolio of Interest
          </h1>
          <p style={{ color: 'var(--on-surface-variant)', marginTop: '8px' }}>Review your saved roles. Click "AI Apply" to generate a tailored resume and cover letter instantly.</p>
        </div>
        
        <div style={{ background: 'var(--surface)', padding: '12px 24px', borderRadius: '12px', border: '1px solid var(--outline-variant)' }}>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--on-surface-variant)', letterSpacing: '0.05em' }}>Saved Pipeline</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>{savedJobs.length}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid var(--surface-container-high)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : savedJobs.length === 0 ? (
        <div style={{ background: 'var(--surface)', padding: '64px', borderRadius: '16px', border: '1px solid var(--outline-variant)', textAlign: 'center' }}>
          <Bookmark size={48} color="var(--surface-container-highest)" style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>No Saved Jobs Yet</h2>
          <p style={{ color: 'var(--on-surface-variant)' }}>Go back to the Swipe Discovery queue to start matching with roles.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
          {savedJobs.map((job, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
              key={idx} 
              style={{ background: 'var(--surface)', border: '1px solid var(--outline-variant)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', marginBottom: '4px', lineHeight: 1.3 }}>{job.role}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: 600, fontSize: '14px' }}>
                    <Building2 size={14} /> {job.company}
                  </div>
                </div>
                <div style={{ background: 'rgba(196, 139, 87, 0.1)', color: 'var(--secondary)', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 800 }}>
                  {job.matchPct}% MAT
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px', fontSize: '13px', color: 'var(--on-surface-variant)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={14} /> {job.location}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><DollarSign size={14} /> {job.salary}</div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '24px' }}>
                {(job.techStack || []).map(tech => (
                  <span key={tech} style={{ background: 'var(--surface-container-low)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', border: '1px solid var(--outline-variant)' }}>{tech}</span>
                ))}
              </div>

              {/* AI Apply Button */}
              <button 
                onClick={() => handleApply(job, idx)}
                disabled={applyingJobIdx !== null}
                style={{ 
                  marginTop: 'auto', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', 
                  background: applyingJobIdx === idx ? 'var(--surface-container-high)' : 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  color: applyingJobIdx === idx ? 'var(--on-surface-variant)' : 'var(--on-primary)', 
                  padding: '12px', borderRadius: '8px', border: 'none', 
                  fontWeight: 600, fontSize: '14px', 
                  cursor: applyingJobIdx !== null ? 'wait' : 'pointer',
                  transition: '0.2s',
                  opacity: (applyingJobIdx !== null && applyingJobIdx !== idx) ? 0.5 : 1
                }}
              >
                {applyingJobIdx === idx ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Tailoring Resume with AI...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    AI Apply — Generate Tailored Package
                  </>
                )}
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Application Modal */}
      <AnimatePresence>
        {applicationModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
            onClick={() => setApplicationModal(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ background: 'var(--surface)', borderRadius: '20px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--outline-variant)', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}
            >
              {/* Modal Header */}
              <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--outline-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '22px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Sparkles color="var(--primary)" size={22} /> Application Package Ready
                  </h2>
                  <p style={{ color: 'var(--on-surface-variant)', fontSize: '14px', marginTop: '4px' }}>
                    {applicationModal.jobTitle} at {applicationModal.company}
                  </p>
                </div>
                <button onClick={() => setApplicationModal(null)} style={{ background: 'var(--surface-container)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: 'var(--on-surface-variant)' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ padding: '32px' }}>
                {/* Tailored Resume Section */}
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={18} color="var(--primary)" /> Tailored Resume (LaTeX)
                    </h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {applicationModal.pdfBase64 && (
                        <a 
                          href={`data:application/pdf;base64,${applicationModal.pdfBase64}`}
                          download={`${(applicationModal.jobTitle || 'Tailored').replace(/[^a-zA-Z0-9]/g, '_')}_Resume.pdf`}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--primary)', color: 'var(--on-primary)', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}
                        >
                          <FileText size={14} /> Download PDF
                        </a>
                      )}
                      <button 
                        onClick={() => handleCopy(applicationModal.tailoredCv, 'cv')}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--surface-container)', border: '1px solid var(--outline-variant)', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', color: 'var(--on-surface)', fontWeight: 600 }}
                      >
                        {copiedField === 'cv' ? <><Check size={14} color="#10B981" /> Copied!</> : <><Copy size={14} /> Copy LaTeX</>}
                      </button>
                    </div>
                  </div>
                  <pre style={{ 
                    background: 'var(--surface-container-low)', 
                    border: '1px solid var(--outline-variant)', 
                    borderRadius: '8px', 
                    padding: '16px', 
                    fontSize: '11px', 
                    lineHeight: 1.5, 
                    maxHeight: '250px', 
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    color: 'var(--on-surface-variant)',
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
                  }}>
                    {applicationModal.tailoredCv}
                  </pre>
                </div>

                {/* Cover Letter Section */}
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Mail size={18} color="var(--secondary)" /> Cover Letter
                    </h3>
                    <button 
                      onClick={() => handleCopy(applicationModal.coverLetter, 'cl')}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--surface-container)', border: '1px solid var(--outline-variant)', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', color: 'var(--on-surface)', fontWeight: 600 }}
                    >
                      {copiedField === 'cl' ? <><Check size={14} color="#10B981" /> Copied!</> : <><Copy size={14} /> Copy Letter</>}
                    </button>
                  </div>
                  <div style={{ 
                    background: 'var(--surface-container-low)', 
                    border: '1px solid var(--outline-variant)', 
                    borderRadius: '8px', 
                    padding: '20px', 
                    fontSize: '14px', 
                    lineHeight: 1.7, 
                    maxHeight: '250px', 
                    overflowY: 'auto',
                    color: 'var(--on-surface)',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {applicationModal.coverLetter}
                  </div>

                {/* Auto-Apply Bot Result Section */}
                {applicationModal.botResult && applicationModal.botResult.success && (
                  <div style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={18} color="#FF9800" /> Autonomous Agent Application
                      </h3>
                      <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, border: '1px solid #10B981' }}>
                        Application Filled
                      </div>
                    </div>
                    
                    <div style={{ background: '#0D0D0D', border: '1px solid #333', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', background: '#1A1A1A', color: '#10B981', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", borderBottom: '1px solid #333' }}>
                        {'>'} {applicationModal.botResult.message}
                      </div>
                      <div style={{ padding: '0', textAlign: 'center', background: '#000' }}>
                        {applicationModal.botResult.screenshot && (
                          <img 
                            src={`data:image/png;base64,${applicationModal.botResult.screenshot}`} 
                            alt="Headless Chrome Application Execution" 
                            style={{ maxWidth: '100%', maxHeight: '400px', width: 'auto', display: 'block', margin: '0 auto', opacity: 0.9 }} 
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  {applicationModal.jobUrl && (
                    <a 
                      href={applicationModal.jobUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      style={{ 
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', 
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))', 
                        color: 'var(--on-primary)', 
                        padding: '14px', borderRadius: '10px', 
                        textDecoration: 'none', fontWeight: 700, fontSize: '15px' 
                      }}
                    >
                      Go to Job Portal <ExternalLink size={16} />
                    </a>
                  )}
                  <button 
                    onClick={() => setApplicationModal(null)}
                    style={{ 
                      flex: applicationModal.jobUrl ? 0 : 1,
                      padding: '14px 24px', 
                      background: 'var(--surface-container)', 
                      border: '1px solid var(--outline-variant)', 
                      borderRadius: '10px', 
                      cursor: 'pointer', 
                      fontWeight: 600, 
                      color: 'var(--on-surface)',
                      fontSize: '14px'
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

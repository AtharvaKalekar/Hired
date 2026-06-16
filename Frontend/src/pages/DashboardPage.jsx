import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, Lock, Eye, AlertCircle, CheckCircle, Clock, 
  Github, Code2, FileText, RefreshCw, Save, Sparkles, 
  AlertTriangle, Play, ChevronRight, Terminal, User, FileJson, UploadCloud
} from 'lucide-react';
import GlassPanel from '../components/ui/GlassPanel';
import GlowingButton from '../components/ui/GlowingButton';
import useIsMobile from '../hooks/useIsMobile';

export default function DashboardPage() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('Overview'); // 'Overview', 'Achievements', 'LaTeX CV'
  
  // Profile state
  const [profile, setProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  // LaTeX Editor state
  const [latexCode, setLatexCode] = useState('');
  const [pdfBase64, setPdfBase64] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // AI Regeneration state
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [leetcodeUrl, setLeetcodeUrl] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenLogs, setRegenLogs] = useState([]);
  const [regenError, setRegenError] = useState('');

  const typingTimeoutRef = useRef(null);

  // Fetch complete profile on mount
  const fetchProfile = async (shouldCompile = true) => {
    const userInfo = JSON.parse(localStorage.getItem('user_info')) || {};
    if (!userInfo._id) {
      setIsLoadingProfile(false);
      return;
    }
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/profile/${userInfo._id}`);
      const data = await res.json();
      if (data.success && data.data) {
        setProfile(data.data);
        setGithubUrl(data.data.githubUrl || '');
        setLeetcodeUrl(data.data.leetcodeUrl || '');
        setLinkedinUrl(data.data.linkedinUrl || '');
        
        if (data.data.cvLatex) {
          setLatexCode(data.data.cvLatex);
          if (shouldCompile) {
            compileLatexReq(data.data.cvLatex);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
      setErrorMsg("Failed to load profile from server.");
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    fetchProfile(true);
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // Compile LaTeX to PDF
  const compileLatexReq = async (codeToCompile) => {
    if (!codeToCompile) return;
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

  // Debounced auto-compilation
  const handleLatexChange = (e) => {
    const newCode = e.target.value;
    setLatexCode(newCode);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      compileLatexReq(newCode);
    }, 2000); // 2s debounce
  };

  // Save changes & extract keywords
  const handleSaveCV = async () => {
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const userInfo = JSON.parse(localStorage.getItem('user_info')) || {};
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/profile/confirm-resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userInfo._id, finalLatex: latexCode })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save CV');
      
      setSuccessMsg('LaTeX CV saved and matching keywords re-extracted successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchProfile(false); // Reload profile details
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to save CV: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Trigger full AI CV synthesis
  const executeAISynthesis = async () => {
    setRegenError('');
    setIsRegenerating(true);
    setRegenLogs([{ time: '0.0s', text: '[Agent] Resetting AI engine context...', duration: 500 }]);

    const userInfo = JSON.parse(localStorage.getItem('user_info')) || {};
    if (!userInfo._id) {
      setRegenError('User ID missing. Try logging in again.');
      setIsRegenerating(false);
      return;
    }

    try {
      const synthInterval = setInterval(() => {
        setRegenLogs(prev => [...prev, { time: `${(prev.length * 1.5).toFixed(1)}s`, text: '[Compiler] Interfacing with Groq and building resume structure...', duration: 500 }]);
      }, 5000);

      const formData = new FormData();
      formData.append('userId', userInfo._id);
      formData.append('githubUrl', githubUrl);
      formData.append('linkedinUrl', linkedinUrl);
      formData.append('leetcodeUrl', leetcodeUrl);
      if (resumeFile) {
        formData.append('resumePdf', resumeFile);
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/profile/generate-cv`, {
        method: 'POST',
        body: formData
      });

      clearInterval(synthInterval);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'AI Engine failed during profile parsing.');
      }

      setRegenLogs(prev => [...prev, { time: 'READY', text: '[System] CV successfully compiled. Loading workspace...', duration: 0 }]);
      
      // Reload profile
      await fetchProfile(true);
      setIsRegenerating(false);
      setResumeFile(null);
      setTimeout(() => {
        setShowRegenModal(false);
        setRegenLogs([]);
      }, 1500);

    } catch (error) {
      console.error(error);
      setIsRegenerating(false);
      setRegenError(error.message);
      setRegenLogs(prev => [...prev, { time: 'ERROR', text: `[System Failure] ${error.message}`, duration: 0 }]);
    }
  };

  // Helper parsers for raw profile strings
  const parseLeetCodeData = (rawText) => {
    if (!rawText) return null;
    const result = { total: 0, easy: 0, medium: 0, hard: 0, ranking: 'N/A', badges: [] };
    
    const rankingMatch = rawText.match(/Global Ranking:\s*#?([^\n\r]+)/i);
    result.ranking = rankingMatch ? rankingMatch[1].trim() : 'N/A';
    
    const totalMatch = rawText.match(/Total Accepted:\s*(\d+)/i);
    result.total = totalMatch ? parseInt(totalMatch[1], 10) : 0;
    
    const easyMatch = rawText.match(/Easy:\s*(\d+)/i);
    result.easy = easyMatch ? parseInt(easyMatch[1], 10) : 0;
    
    const mediumMatch = rawText.match(/Medium:\s*(\d+)/i);
    result.medium = mediumMatch ? parseInt(mediumMatch[1], 10) : 0;
    
    const hardMatch = rawText.match(/Hard:\s*(\d+)/i);
    result.hard = hardMatch ? parseInt(hardMatch[1], 10) : 0;
    
    const badgesMatch = rawText.match(/--- Badges ---\s*([\s\S]*)/i);
    if (badgesMatch && badgesMatch[1]) {
      const bText = badgesMatch[1].trim();
      result.badges = bText && bText.toLowerCase() !== 'no badges' ? bText.split(',').map(b => b.trim()) : [];
    }
    
    return result;
  };

  const parseGitHubData = (rawText) => {
    if (!rawText) return null;
    const result = { name: 'N/A', bio: 'N/A', location: 'N/A', repos: 0, followers: 0, following: 0 };
    
    const nameMatch = rawText.match(/Name:\s*([^\n\r]+)/i);
    result.name = nameMatch ? nameMatch[1].trim() : 'N/A';
    
    const bioMatch = rawText.match(/Bio:\s*([^\n\r]+)/i);
    result.bio = bioMatch ? bioMatch[1].trim() : 'N/A';
    
    const locMatch = rawText.match(/Location:\s*([^\n\r]+)/i);
    result.location = locMatch ? locMatch[1].trim() : 'N/A';
    
    const reposMatch = rawText.match(/Public Repos:\s*(\d+)/i);
    result.repos = reposMatch ? parseInt(reposMatch[1], 10) : 0;
    
    const followersMatch = rawText.match(/Followers:\s*(\d+)/i);
    result.followers = followersMatch ? parseInt(followersMatch[1], 10) : 0;
    
    const followingMatch = rawText.match(/Following:\s*(\d+)/i);
    result.following = followingMatch ? parseInt(followingMatch[1], 10) : 0;
    
    return result;
  };

  const parseLinkedInData = (rawText) => {
    if (!rawText) return null;
    if (rawText.includes("Error scraping")) return { error: rawText };
    if (rawText.includes("LINKEDIN_EMAIL and LINKEDIN_PASSWORD")) return { error: rawText };
    
    const result = { name: 'N/A', jobTitle: 'N/A', company: 'N/A', location: 'N/A', about: 'N/A', experiences: [], educations: [] };
    
    const nameMatch = rawText.match(/Name:\s*([^\n\r]+)/i);
    result.name = nameMatch ? nameMatch[1].trim() : 'N/A';
    
    const titleMatch = rawText.match(/Job Title:\s*([^\n\r]+)/i);
    result.jobTitle = titleMatch ? titleMatch[1].trim() : 'N/A';
    
    const companyMatch = rawText.match(/Company:\s*([^\n\r]+)/i);
    result.company = companyMatch ? companyMatch[1].trim() : 'N/A';
    
    const locMatch = rawText.match(/Location:\s*([^\n\r]+)/i);
    result.location = locMatch ? locMatch[1].trim() : 'N/A';
    
    const aboutMatch = rawText.match(/About:\s*([^\n\r]+)/i);
    result.about = aboutMatch ? aboutMatch[1].trim() : 'N/A';
    
    const expSection = rawText.match(/--- Experience ---([\s\S]*?)--- Education ---/i);
    if (expSection && expSection[1]) {
      result.experiences = expSection[1].trim().split('\n').map(line => line.trim().replace(/^-\s*/, '')).filter(Boolean);
    }
    
    const eduSection = rawText.match(/--- Education ---([\s\S]*)/i);
    if (eduSection && eduSection[1]) {
      result.educations = eduSection[1].trim().split('\n').map(line => line.trim().replace(/^-\s*/, '')).filter(Boolean);
    }
    
    return result;
  };

  const gitStats = profile ? parseGitHubData(profile.githubData) : null;
  const leetStats = profile ? parseLeetCodeData(profile.leetcodeData) : null;
  const linkedinStats = profile ? parseLinkedInData(profile.linkedinData) : null;

  const StatBox = ({ title, value, subtext }) => (
    <div style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--outline-variant)', borderRadius: '12px', flex: 1, minWidth: '200px' }}>
      <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--on-surface-variant)', letterSpacing: '0.05em', marginBottom: '8px' }}>{title}</div>
      <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'Manrope', color: 'var(--primary)', marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: 600 }}>{subtext}</div>
    </div>
  );

  const StatusPill = ({ label, color }) => (
    <span style={{ padding: '4px 8px', borderRadius: '4px', background: `color-mix(in srgb, ${color} 10%, transparent)`, color: color, fontSize: '11px', fontWeight: 600, border: `1px solid color-mix(in srgb, ${color} 20%, transparent)` }}>
      {label}
    </span>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
      
      {/* Top Controls */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '16px' : '0', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center' }}>
        <div>
           <h1 style={{ fontSize: isMobile ? '24px' : '32px', marginBottom: '4px', color: 'var(--primary)' }}>Command Center</h1>
           <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>Monitor your live profiles, edit LaTeX CV, and execute AI synthesis.</p>
        </div>
        
        <div style={{ display: 'flex', background: 'var(--surface-container-high)', padding: '4px', borderRadius: '8px', border: '1px solid var(--outline-variant)', width: isMobile ? '100%' : 'auto' }}>
          {['Overview', 'Developer Profiles', 'LaTeX CV Editor'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                 flex: 1,
                 background: activeTab === tab ? 'var(--surface)' : 'transparent',
                 color: activeTab === tab ? 'var(--primary)' : 'var(--on-surface-variant)',
                 border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                 boxShadow: activeTab === tab ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                 transition: 'all 0.2s ease'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {isLoadingProfile ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '40vh', gap: '16px' }}>
          <RefreshCw size={36} className="spinner" color="var(--primary)" />
          <span style={{ fontSize: '14px', color: 'var(--on-surface-variant)' }}>Loading Command Center metrics...</span>
        </div>
      ) : !profile ? (
        <GlassPanel style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center' }}>
          <AlertTriangle size={48} color="var(--secondary)" />
          <div>
            <h2 style={{ fontSize: '20px', color: 'var(--primary)', marginBottom: '8px' }}>No Profile Extracted</h2>
            <p style={{ color: 'var(--on-surface-variant)', maxWidth: '500px', fontSize: '14px', lineHeight: 1.6 }}>
              It looks like you haven't completed onboarding or generated a resume profile yet. Complete the extraction to unlock the Command Center features.
            </p>
          </div>
          <GlowingButton onClick={() => setShowRegenModal(true)}>
            <Sparkles size={16} style={{ marginRight: '8px' }} />
            Trigger AI Profile Extraction
          </GlowingButton>
        </GlassPanel>
      ) : (
        <>
          {/* ==================== TAB 1: OVERVIEW ==================== */}
          {activeTab === 'Overview' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Top Level Metrics */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                <StatBox title="Saved Opportunities" value={profile.savedJobs ? profile.savedJobs.length : 0} subtext="Tracked in Opportunity Hub" />
                <StatBox title="Extracted Skills" value={profile.jobKeywords ? profile.jobKeywords.length : 0} subtext="Primary keywords driving matches" />
                <StatBox title="Global CP Ranking" value={leetStats ? `#${leetStats.ranking}` : 'N/A'} subtext="LeetCode performance badge" />
              </div>

              {/* Saved Opportunities Table */}
              <GlassPanel intensity="low" style={{ padding: '0', overflow: 'hidden' }}>
                 <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--outline-variant)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyBetween: 'space-between' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <BarChart3 size={16} color="var(--primary)" />
                     <span style={{ fontSize: '14px', fontWeight: 600 }}>Opportunity Ledger</span>
                   </div>
                 </div>

                 <div style={{ width: '100%', overflowX: 'auto' }}>
                   {profile.savedJobs && profile.savedJobs.length > 0 ? (
                     <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                       <thead>
                         <tr style={{ background: 'var(--surface-container-low)', color: 'var(--on-surface-variant)' }}>
                           <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Company</th>
                           <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Position</th>
                           <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Location</th>
                           <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Match Rate</th>
                         </tr>
                       </thead>
                       <tbody>
                         {profile.savedJobs.slice(0, 5).map((job, i) => (
                           <tr key={i} style={{ borderBottom: '1px solid var(--outline-variant)', background: 'var(--surface)' }}>
                             <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--primary)' }}>{job.company || 'Unknown Company'}</td>
                             <td style={{ padding: '16px 24px', color: 'var(--on-surface)' }}>{job.title}</td>
                             <td style={{ padding: '16px 24px', color: 'var(--on-surface-variant)' }}>{job.location || 'India'}</td>
                             <td style={{ padding: '16px 24px' }}>
                               <StatusPill 
                                 label={`${job.matchPct || 75}% Match`} 
                                 color={(job.matchPct || 75) >= 85 ? '#10B981' : (job.matchPct || 75) >= 60 ? 'var(--secondary)' : '#ef4444'} 
                               />
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   ) : (
                     <div style={{ padding: '32px', textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: '14px' }}>
                       No opportunities saved yet. Go swipe some jobs to add them to your ledger!
                     </div>
                   )}
                 </div>
              </GlassPanel>

              {/* Security Credentials Vault Mock */}
              <GlassPanel intensity="highest" style={{ padding: '24px', background: 'var(--surface)' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                   <Lock size={20} color="var(--secondary)" />
                   <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Auto-Apply Security Vault</h3>
                 </div>
                 <p style={{ color: 'var(--on-surface-variant)', marginBottom: '20px', fontSize: '13px', lineHeight: 1.5 }}>
                   The copilot agent utilizes these configurations to safely autofill job forms. Credentials remain securely encrypted client-side.
                 </p>

                 <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '16px' }}>
                   {[
                     { site: 'Workday Integrator', user: profile.email },
                     { site: 'Greenhouse API Vault', user: profile.email },
                   ].map((cred, i) => (
                     <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--surface-container-low)', borderRadius: '8px', border: '1px solid var(--outline-variant)' }}>
                       <div>
                         <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>{cred.site}</h4>
                         <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)', fontFamily: 'JetBrains Mono' }}>{cred.user}</div>
                       </div>
                       <button style={{ background: 'none', border: '1px solid var(--outline-variant)', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', color: 'var(--on-surface-variant)', background: 'var(--surface)' }}>
                         <Eye size={12} />
                       </button>
                     </div>
                   ))}
                 </div>
              </GlassPanel>
            </motion.div>
          )}

          {/* ==================== TAB 2: DEVELOPER PROFILES ==================== */}
          {activeTab === 'Developer Profiles' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                {/* GitHub metrics */}
                <GlassPanel style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--outline-variant)', paddingBottom: '12px' }}>
                    <Github size={24} color="var(--primary)" />
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700 }}>GitHub Stats & Achievements</h3>
                      <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>{profile.githubUrl || 'Not linked'}</span>
                    </div>
                  </div>
                  {gitStats ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-around', background: 'var(--surface-container-low)', padding: '12px', borderRadius: '8px' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>{gitStats.repos}</div>
                          <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Repositories</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>{gitStats.followers}</div>
                          <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Followers</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>{gitStats.following}</div>
                          <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Following</div>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: '4px' }}>Developer Bio</div>
                        <p style={{ fontSize: '13px', lineHeight: 1.5, background: 'var(--surface-container-low)', padding: '12px', borderRadius: '8px', fontStyle: gitStats.bio === 'N/A' ? 'italic' : 'normal' }}>
                          {gitStats.bio !== 'N/A' ? gitStats.bio : 'No bio provided on GitHub.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--on-surface-variant)', fontSize: '13px', fontStyle: 'italic' }}>GitHub parsing data is empty.</div>
                  )}

                  {/* Repository quality analysis */}
                  {profile.githubReposData && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: '8px' }}>Repository Pipeline Quality Evaluation</div>
                      <div style={{
                        maxHeight: '160px', overflowY: 'auto', background: '#1E1E1E', color: '#D4D4D4',
                        padding: '12px', borderRadius: '8px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', lineHeight: 1.5
                      }}>
                        {profile.githubReposData}
                      </div>
                    </div>
                  )}
                </GlassPanel>

                {/* LeetCode metrics */}
                <GlassPanel style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--outline-variant)', paddingBottom: '12px' }}>
                    <Code2 size={24} color="var(--primary)" />
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700 }}>LeetCode Competitive Stats</h3>
                      <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>{profile.leetcodeUrl || 'Not linked'}</span>
                    </div>
                  </div>
                  {leetStats ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>Total Solved: <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{leetStats.total}</span></div>
                        <StatusPill label={`Global #${leetStats.ranking}`} color="var(--secondary)" />
                      </div>
                      
                      {/* Breakdown sliders */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div>
                          <div style={{ display: 'flex', justifyBetween: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                            <span style={{ color: '#10B981', fontWeight: 600 }}>Easy</span>
                            <span style={{ color: 'var(--on-surface-variant)' }}>{leetStats.easy}</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: 'var(--surface-container-high)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: '#10B981', width: `${leetStats.total > 0 ? (leetStats.easy / leetStats.total) * 100 : 0}%` }} />
                          </div>
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyBetween: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                            <span style={{ color: 'var(--secondary)', fontWeight: 600 }}>Medium</span>
                            <span style={{ color: 'var(--on-surface-variant)' }}>{leetStats.medium}</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: 'var(--surface-container-high)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: 'var(--secondary)', width: `${leetStats.total > 0 ? (leetStats.medium / leetStats.total) * 100 : 0}%` }} />
                          </div>
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyBetween: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                            <span style={{ color: '#ef4444', fontWeight: 600 }}>Hard</span>
                            <span style={{ color: 'var(--on-surface-variant)' }}>{leetStats.hard}</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: 'var(--surface-container-high)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: '#ef4444', width: `${leetStats.total > 0 ? (leetStats.hard / leetStats.total) * 100 : 0}%` }} />
                          </div>
                        </div>
                      </div>

                      {/* Badges */}
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: '8px' }}>Profile Badges</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {leetStats.badges && leetStats.badges.length > 0 ? (
                            leetStats.badges.map((badge, idx) => (
                              <span key={idx} style={{ padding: '4px 8px', borderRadius: '6px', background: 'var(--surface-container-high)', border: '1px solid var(--outline-variant)', fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>
                                🏆 {badge}
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>No LeetCode badges retrieved.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--on-surface-variant)', fontSize: '13px', fontStyle: 'italic' }}>LeetCode parsing data is empty.</div>
                  )}
                </GlassPanel>

                {/* LinkedIn metrics */}
                <GlassPanel style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--outline-variant)', paddingBottom: '12px' }}>
                    <div style={{ padding: '6px', background: '#0077B5', borderRadius: '6px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                    </div>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700 }}>LinkedIn Career Data</h3>
                      <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>{profile.linkedinUrl || 'Not linked'}</span>
                    </div>
                  </div>
                  {linkedinStats ? (
                    linkedinStats.error ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertTriangle size={14} />
                          <span>Login Challenge Triggered</span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', lineHeight: 1.5, background: 'var(--surface-container-low)', padding: '12px', borderRadius: '8px' }}>
                          LinkedIn's bot detection challenged the headless email/password login.
                          <br /><br />
                          <strong>Recommended Fix</strong>: Add your LinkedIn session cookie <code>LINKEDIN_LI_AT</code> to your <code>Backend/ai_agent/.env</code> file to bypass the login check completely.
                          <br /><br />
                          <span style={{ fontSize: '11px', color: 'var(--secondary)', display: 'block' }}>
                            How: Open LinkedIn in Chrome &rarr; Inspect &rarr; Application &rarr; Cookies &rarr; Copy the value of <code>li_at</code>.
                          </span>
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ background: 'var(--surface-container-low)', padding: '12px', borderRadius: '8px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary)' }}>{linkedinStats.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>{linkedinStats.jobTitle}</div>
                          {linkedinStats.location && <div style={{ fontSize: '11px', color: 'var(--secondary)', marginTop: '2px' }}>📍 {linkedinStats.location}</div>}
                        </div>
                        
                        {linkedinStats.experiences && linkedinStats.experiences.length > 0 && (
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: '6px' }}>Experience</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                              {linkedinStats.experiences.map((exp, idx) => (
                                <div key={idx} style={{ fontSize: '12px', background: 'var(--surface-container-low)', padding: '8px 12px', borderRadius: '6px', borderLeft: '3px solid var(--secondary)' }}>
                                  {exp}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {linkedinStats.educations && linkedinStats.educations.length > 0 && (
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: '6px' }}>Education</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {linkedinStats.educations.map((edu, idx) => (
                                <div key={idx} style={{ fontSize: '12px', background: 'var(--surface-container-low)', padding: '8px 12px', borderRadius: '6px', color: 'var(--on-surface-variant)' }}>
                                  🎓 {edu}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    <div style={{ color: 'var(--on-surface-variant)', fontSize: '13px', fontStyle: 'italic' }}>LinkedIn scraping data is empty.</div>
                  )}
                </GlassPanel>
              </div>

              {/* Parsed Resume Text */}
              {profile.resumeData && (
                <GlassPanel style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--outline-variant)', paddingBottom: '12px' }}>
                    <FileText size={20} color="var(--primary)" />
                    <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Parsed Resume Raw Text Content</h3>
                  </div>
                  <div style={{
                    maxHeight: '300px', overflowY: 'auto', padding: '16px', background: '#151515', color: '#88C0D0',
                    fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', lineHeight: 1.6, borderRadius: '8px', border: '1px solid #2e2e2e'
                  }}>
                    {profile.resumeData}
                  </div>
                </GlassPanel>
              )}
            </motion.div>
          )}

          {/* ==================== TAB 3: LATEX CV EDITOR ==================== */}
          {activeTab === 'LaTeX CV Editor' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Toolbar */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyBetween: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <GlowingButton 
                    variant="secondary" 
                    onClick={() => compileLatexReq(latexCode)} 
                    disabled={isCompiling}
                    style={{ fontSize: '13px', padding: '8px 16px' }}
                  >
                    <RefreshCw size={14} style={{ marginRight: '6px' }} className={isCompiling ? 'spinner' : ''} />
                    {isCompiling ? 'Compiling...' : 'Recompile'}
                  </GlowingButton>
                  
                  <GlowingButton 
                    onClick={handleSaveCV} 
                    disabled={isSaving || isCompiling}
                    style={{ background: '#10B981', color: 'white', fontSize: '13px', padding: '8px 16px' }}
                  >
                    <Save size={14} style={{ marginRight: '6px' }} />
                    {isSaving ? 'Saving...' : 'Save & Build'}
                  </GlowingButton>
                </div>

                <GlowingButton 
                  onClick={() => setShowRegenModal(true)} 
                  style={{ background: 'var(--primary)', color: 'var(--on-primary)', fontSize: '13px', padding: '8px 16px', marginLeft: isMobile ? '0' : 'auto' }}
                >
                  <Sparkles size={14} style={{ marginRight: '6px' }} />
                  AI Re-Synthesize CV
                </GlowingButton>
              </div>

              {successMsg && (
                <div style={{ padding: '10px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={16} />
                  {successMsg}
                </div>
              )}

              {errorMsg && (
                <div style={{ padding: '10px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <strong>Error:</strong> {errorMsg}
                </div>
              )}

              {/* Workspace Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px', height: '65vh' }}>
                
                {/* Source code editor */}
                <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--surface)', border: '1px solid var(--outline-variant)', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 16px', background: 'var(--surface-container-high)', borderBottom: '1px solid var(--outline-variant)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Terminal size={14} color="var(--primary)" />
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>LaTeX Source Editor</span>
                    {isCompiling && <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--secondary)' }}>Auto-compiling...</span>}
                  </div>
                  <textarea 
                    value={latexCode}
                    onChange={handleLatexChange}
                    spellCheck="false"
                    style={{
                      flex: 1, width: '100%', padding: '16px', background: '#1E1E1E', color: '#D4D4D4',
                      fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', lineHeight: 1.6, border: 'none', outline: 'none', resize: 'none'
                    }}
                  />
                </div>

                {/* PDF rendering frame */}
                <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--surface)', border: '1px solid var(--outline-variant)', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 16px', background: 'var(--surface-container-high)', borderBottom: '1px solid var(--outline-variant)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={14} color="var(--primary)" />
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Tectonic PDF Render (Live View)</span>
                  </div>
                  <div style={{ flex: 1, background: '#525659', position: 'relative' }}>
                    {pdfBase64 ? (
                      <iframe 
                        src={`data:application/pdf;base64,${pdfBase64}#toolbar=0`} 
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        title="CV Compilation Preview"
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'white', opacity: 0.5, fontSize: '13px', gap: '8px' }}>
                        {isCompiling ? (
                          <>
                            <RefreshCw size={24} className="spinner" />
                            <span>Compiling LaTeX source...</span>
                          </>
                        ) : (
                          <span>No render preview available. Type some LaTeX or click Recompile.</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </>
      )}

      {/* ==================== POPUP: AI REGENERATION DRAWER ==================== */}
      <AnimatePresence>
        {showRegenModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '20px'
          }}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                width: '100%', maxWidth: '600px', background: 'var(--surface)', border: '1px solid var(--outline-variant)',
                borderRadius: '16px', padding: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '20px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={20} color="var(--primary)" />
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>AI CV Synthesis Controller</h3>
                </div>
                <button 
                  onClick={() => !isRegenerating && setShowRegenModal(false)}
                  disabled={isRegenerating}
                  style={{
                    background: 'none', border: 'none', cursor: isRegenerating ? 'not-allowed' : 'pointer',
                    color: 'var(--on-surface-variant)', fontSize: '18px'
                  }}
                >
                  &times;
                </button>
              </div>

              {isRegenerating ? (
                // Terminal logging screen
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{
                    height: '260px', background: '#1A1A1A', padding: '16px', borderRadius: '8px',
                    fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', lineHeight: 1.5, overflowY: 'auto', border: '1px solid #333'
                  }}>
                    {regenLogs.map((log, idx) => (
                      <div key={idx} style={{ marginBottom: '6px' }}>
                        <span style={{ color: 'var(--secondary)', marginRight: '10px' }}>{log.time}</span>
                        <span style={{ color: log.text.includes('[System]') ? '#10B981' : '#EEE' }}>{log.text}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--secondary)', fontSize: '12px', fontWeight: 600 }}>
                    <RefreshCw size={14} className="spinner" />
                    <span>Engaging scraper modules and running LLM pipeline (approx 30s)...</span>
                  </div>
                </div>
              ) : (
                // Configuration Form
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
                    Enter/modify your credentials and upload your resume. The AI agent will parse these sources to completely rebuild your custom CV structure.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--on-surface-variant)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>GitHub URL</label>
                      <input 
                        type="text" placeholder="https://github.com/username" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-container-high)', border: '1px solid var(--outline-variant)', borderRadius: '8px', color: 'var(--on-surface)', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--on-surface-variant)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>LeetCode URL</label>
                      <input 
                        type="text" placeholder="https://leetcode.com/username" value={leetcodeUrl} onChange={(e) => setLeetcodeUrl(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-container-high)', border: '1px solid var(--outline-variant)', borderRadius: '8px', color: 'var(--on-surface)', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--on-surface-variant)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>LinkedIn URL</label>
                      <input 
                        type="text" placeholder="https://linkedin.com/in/username" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-container-high)', border: '1px solid var(--outline-variant)', borderRadius: '8px', color: 'var(--on-surface)', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--on-surface-variant)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Update Resume PDF</label>
                      <div style={{ position: 'relative', border: '1px dashed var(--outline-variant)', borderRadius: '8px', padding: '14px', background: 'var(--surface-container-high)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <UploadCloud size={20} color={resumeFile ? "#10B981" : "var(--primary)"} />
                        <span style={{ fontSize: '13px', color: resumeFile ? '#10B981' : 'var(--on-surface-variant)', fontWeight: 600 }}>
                          {resumeFile ? resumeFile.name : 'Upload new PDF resume (Optional)'}
                        </span>
                        <input 
                          type="file" accept=".pdf" onChange={(e) => setResumeFile(e.target.files[0])}
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                        />
                      </div>
                    </div>
                  </div>

                  {regenError && (
                    <div style={{ padding: '10px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', fontSize: '12px' }}>
                      {regenError}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <GlowingButton onClick={() => setShowRegenModal(false)} variant="secondary" style={{ flex: 1, justifyContent: 'center' }}>Cancel</GlowingButton>
                    <GlowingButton onClick={executeAISynthesis} style={{ flex: 1, justifyContent: 'center' }}>
                      <Play size={14} style={{ marginRight: '6px' }} />
                      Synthesize
                    </GlowingButton>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global CSS spinner */}
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spinner { animation: spin 1.5s linear infinite; }
      `}</style>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Briefcase, MapPin, DollarSign, Clock, Code2, Sparkles, ExternalLink, RefreshCw, AlertCircle, ChevronDown, Trophy } from 'lucide-react';
import GlassPanel from '../components/ui/GlassPanel';
import GlowingButton from '../components/ui/GlowingButton';
import useIsMobile from '../hooks/useIsMobile';

export default function HomeHubPage() {
  const isMobile = useIsMobile();
  const [skills, setSkills] = useState('');
  const [experience, setExperience] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('job');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isDone, setIsDone] = useState(false);
  const [reachedCap, setReachedCap] = useState(false);
  const esRef = useRef(null);             // active EventSource connection
  const sessionExcludeIds = useRef([]);   // IDs sent this session (for Find More dedup)

  const userInfo = JSON.parse(localStorage.getItem('user_info')) || {};
  const userId = userInfo._id;
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  // Quiet DB-only fetch when user switches category tabs (no scraping)
  useEffect(() => {
    if (!userId) return; // guard: don't fire before user is loaded
    handleSearch(null, false);
  }, [category]);

  // Close SSE connection on unmount
  useEffect(() => {
    return () => {
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
    };
  }, []);

  const handleSearch = (e, triggerScrape = false) => {
    if (e) e.preventDefault();
    if (!userId) return;

    // Close any existing SSE connection
    if (esRef.current) { esRef.current.close(); esRef.current = null; }

    // Reset previous results and exclusions on new search or category tab switch
    sessionExcludeIds.current = [];
    setJobs([]);

    setError('');
    setLoading(true);
    setSearched(true);
    setIsDone(false);
    setReachedCap(false);
    setStatusMessage(category === 'meetup' || category === 'hackathon'
      ? 'Searching events across Luma and Meetup...'
      : 'Searching across top job boards...');

    const params = new URLSearchParams({
      userId,
      query:      skills.trim(),
      location:   location.trim(),
      category,
      excludeIds: sessionExcludeIds.current.join(','),
    });

    const es = new EventSource(`${API_URL}/api/jobs/search-stream?${params}`);
    esRef.current = es;

    es.addEventListener('job', (e) => {
      const listing = JSON.parse(e.data);

      // Apply experience filter client-side before appending
      if (experience && (category === 'job' || category === 'internship')) {
        const desc  = (listing.description || '').toLowerCase();
        const title = (listing.role || '').toLowerCase();
        if (experience === 'fresh' && !(
          desc.includes('fresher') || desc.includes('no experience') ||
          desc.includes('entry level') || title.includes('junior') || title.includes('fresher')
        )) return;
        if (experience === '1-3' && !/1\s*-\s*3|1\s*to\s*3|2\s*year|3\s*year|1\s*year/i.test(desc)) return;
        if (experience === '3-5' && !/3\s*-\s*5|3\s*to\s*5|4\s*year|5\s*year/i.test(desc)) return;
        if (experience === '5plus' && !/5\s*\+|6\s*year|7\s*year|8\s*year|9\s*year|10\s*year/i.test(desc)) return;
      }

      sessionExcludeIds.current.push(listing.id);
      setJobs(prev => {
        const updated = [...prev, listing];
        return updated.sort((a, b) => (b.matchPct || 0) - (a.matchPct || 0));
      });
    });

    es.addEventListener('status', (e) => {
      const { message } = JSON.parse(e.data);
      setStatusMessage(message);
    });

    es.addEventListener('done', (e) => {
      const { reachedCap: cap } = JSON.parse(e.data);
      setReachedCap(cap);
      setIsDone(true);
      setLoading(false);
      es.close();
      esRef.current = null;
    });

    es.addEventListener('timeout', () => {
      setIsDone(true);
      setLoading(false);
      es.close();
      esRef.current = null;
    });

    es.onerror = () => {
      setLoading(false);
      setIsDone(true);
      es.close();
      esRef.current = null;
    };
  };

  // Find More: opens a fresh SSE stream appending to current results
  const handleFindMore = () => {
    if (!userId) return;
    if (esRef.current) { esRef.current.close(); esRef.current = null; }

    setLoading(true);
    setIsDone(false);
    setReachedCap(false);
    setStatusMessage('Finding more results...');

    const params = new URLSearchParams({
      userId,
      query:      skills.trim(),
      location:   location.trim(),
      category,
      excludeIds: sessionExcludeIds.current.join(','),
    });

    const es = new EventSource(`${API_URL}/api/jobs/search-stream?${params}`);
    esRef.current = es;

    es.addEventListener('job', (e) => {
      const listing = JSON.parse(e.data);
      sessionExcludeIds.current.push(listing.id);
      setJobs(prev => {
        const updated = [...prev, listing];
        return updated.sort((a, b) => (b.matchPct || 0) - (a.matchPct || 0));
      });
    });
    es.addEventListener('status', (e) => {
      const { message } = JSON.parse(e.data);
      setStatusMessage(message);
    });
    es.addEventListener('done', (e) => {
      const { reachedCap: cap } = JSON.parse(e.data);
      setReachedCap(cap);
      setIsDone(true);
      setLoading(false);
      es.close();
      esRef.current = null;
    });
    es.addEventListener('timeout', () => {
      setIsDone(true);
      setLoading(false);
      es.close();
      esRef.current = null;
    });
    es.onerror = () => {
      setLoading(false);
      setIsDone(true);
      es.close();
      esRef.current = null;
    };
  };

  const handleReset = () => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    sessionExcludeIds.current = [];
    setSkills('');
    setExperience('');
    setLocation('');
    setCategory('job');
    setError('');
    setSearched(false);
    setJobs([]);
    setLoading(false);
    setIsDone(false);
    setReachedCap(false);
    setStatusMessage('');
  };



  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: searched ? 'auto' : 'calc(100vh - 160px)',
      justifyContent: searched ? 'flex-start' : 'center',
      transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      maxWidth: '1000px',
      margin: '0 auto',
      padding: isMobile ? '12px' : '24px',
      gap: '32px'
    }}>
      
      {/* Custom Styles */}
      <style>{`
        @keyframes custom-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .job-card {
          background: #FFFFFF;
          border: 1px solid #DCD6CD;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          cursor: pointer;
          margin-bottom: 16px;
          position: relative;
          overflow: hidden;
          transition: all 0.2s ease;
        }
        
        .job-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(74, 59, 50, 0.08);
          border-color: #C48B57;
        }

        .search-capsule {
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid var(--outline-variant);
          border-radius: 9999px;
          padding: 8px 8px 8px 24px;
          box-shadow: 0 10px 30px rgba(74, 59, 50, 0.04);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          width: 100%;
        }
        
        .search-capsule:focus-within {
          border-color: var(--secondary);
          box-shadow: 0 15px 40px rgba(196, 139, 87, 0.12), 0 0 0 3px rgba(196, 139, 87, 0.08);
          background: #ffffff;
        }

        .search-section {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          padding: 0 16px;
          position: relative;
          height: 100%;
        }

        .search-section-input {
          width: 100%;
          border: none;
          background: transparent;
          outline: none;
          color: var(--primary);
          font-weight: 500;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          padding: 6px 0;
        }

        .search-section-input::placeholder {
          color: var(--on-surface-variant);
          opacity: 0.65;
        }
        
        .search-divider {
          width: 1px;
          height: 32px;
          background: var(--outline-variant);
          flex-shrink: 0;
        }

        /* Mobile stacked version */
        @media (max-width: 768px) {
          .search-capsule {
            flex-direction: column;
            border-radius: 24px;
            padding: 16px;
            gap: 12px;
            align-items: stretch;
          }
          
          .search-section {
            padding: 12px 4px;
            border-bottom: 1px solid var(--outline-variant);
          }
          
          .search-section:last-of-type {
            border-bottom: none;
          }
          
          .search-divider {
            display: none;
          }
        }
      `}</style>

      {/* Main Layout containing Hero & Search Capsule */}
      <motion.div
        layout
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '32px',
          width: '100%',
          textAlign: 'center',
          marginTop: searched ? '12px' : '0px'
        }}
      >
        {/* Hero Banner */}
        <motion.div
          layout
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxWidth: '650px'
          }}
        >
          <motion.h2 
            layout
            style={{ 
              fontSize: isMobile ? '28px' : searched ? '32px' : '44px', 
              fontWeight: 800, 
              color: 'var(--primary)', 
              letterSpacing: '-0.02em',
              lineHeight: 1.2
            }}
          >
            Find your dream job now
          </motion.h2>
          {!searched && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ fontSize: isMobile ? '14px' : '16px', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}
            >
              Over 500,000+ opportunities aggregated from Naukri, LinkedIn, remote portals, and tech communities
            </motion.p>
          )}
        </motion.div>

        {/* Category Selector Tab Pills */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '-8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { id: 'job', label: 'Jobs', icon: Briefcase },
            { id: 'internship', label: 'Internships', icon: Code2 },
            { id: 'meetup', label: 'Meetups', icon: Sparkles },
            { id: 'hackathon', label: 'Hackathons', icon: Trophy }
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = category === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategory(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '9999px',
                  border: isSelected ? '1px solid var(--secondary)' : '1px solid var(--outline-variant)',
                  background: isSelected ? 'var(--primary)' : 'rgba(255, 255, 255, 0.6)',
                  color: isSelected ? 'var(--on-primary)' : 'var(--on-surface-variant)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 4px 12px rgba(74, 59, 50, 0.12)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                }}
              >
                <Icon size={14} style={{ color: isSelected ? 'var(--secondary)' : 'inherit' }} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Capsule Form */}
        <motion.form 
          layout
          onSubmit={(e) => handleSearch(e, true)} 
          style={{ width: '100%', maxWidth: '850px' }}
        >
          <div className="search-capsule">
            
            {/* Field 1: Skills */}
            <div className="search-section" style={{ flex: 1.4 }}>
              <Search size={18} style={{ color: 'var(--on-surface-variant)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder={category === 'meetup' || category === 'hackathon' ? "Enter event keywords (e.g. AI, Web3)" : "Enter skills / designations / companies"}
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="search-section-input"
              />
            </div>

            {(category === 'job' || category === 'internship') && (
              <>
                <div className="search-divider"></div>

                {/* Field 2: Experience */}
                <div className="search-section" style={{ flex: 0.9 }}>
                  <Clock size={18} style={{ color: 'var(--on-surface-variant)', flexShrink: 0 }} />
                  <select
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="search-section-input"
                    style={{ cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', paddingRight: '24px' }}
                  >
                    <option value="">Select experience</option>
                    <option value="fresh">Fresher (0-1 Yrs)</option>
                    <option value="1-3">Early Career (1-3 Yrs)</option>
                    <option value="3-5">Mid-Senior (3-5 Yrs)</option>
                    <option value="5plus">Senior Lead (5+ Yrs)</option>
                  </select>
                  <ChevronDown size={14} style={{ color: 'var(--on-surface-variant)', position: 'absolute', right: '16px', pointerEvents: 'none' }} />
                </div>
              </>
            )}

            <div className="search-divider"></div>

            {/* Field 3: Location */}
            <div className="search-section" style={{ flex: 1.1 }}>
              <MapPin size={18} style={{ color: 'var(--on-surface-variant)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Enter location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="search-section-input"
              />
            </div>

            {/* Search button inside capsule */}
            <GlowingButton 
              type="submit" 
              style={{ 
                padding: '0 28px', 
                height: '48px', 
                borderRadius: '9999px', 
                fontSize: '15px', 
                fontWeight: 700, 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                width: isMobile ? '100%' : 'auto',
                marginTop: isMobile ? '8px' : '0'
              }}
            >
              <Search size={16} /> Search
            </GlowingButton>
          </div>
        </motion.form>
      </motion.div>

      {/* Reset button under search when in results mode */}
      {searched && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ display: 'flex', justifyContent: 'center', marginTop: '-16px' }}
        >
          <button
            type="button"
            onClick={handleReset}
            style={{
              background: 'transparent',
              color: 'var(--on-surface-variant)',
              border: '1px solid var(--outline-variant)',
              padding: '8px 16px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <RefreshCw size={12} /> Clear Search / Back
          </button>
        </motion.div>
      )}

      {/* Error Display */}
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', color: '#EF4444', fontSize: '13px', maxWidth: '850px', margin: '0 auto', width: '100%' }}
        >
          <AlertCircle size={16} /> {error}
        </motion.div>
      )}

      {/* Results Header Section */}
      {searched && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--outline-variant)', paddingBottom: '12px', marginTop: '12px' }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>
            Search Results ({jobs.length})
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={12} style={{ color: 'var(--tertiary)' }} /> Powered by Scraped Direct Listings
          </span>
        </motion.div>
      )}

      {/* Results List */}
      {searched && (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '200px', gap: '16px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {jobs.length > 0 && jobs.map((job) => (
              <div
                key={job.id}
                className="job-card glass-panel"
                onClick={() => job.url && window.open(job.url, '_blank')}
              >
                <div style={{ display: 'flex', gap: '20px', flexDirection: isMobile ? 'column' : 'row' }}>
                  {(category === 'meetup' || category === 'hackathon') && (
                    <div style={{ flexShrink: 0, width: isMobile ? '100%' : '140px', height: isMobile ? '120px' : '110px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #DCD6CD' }}>
                      <img 
                        src={job.image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=400&auto=format&fit=crop'} 
                        alt={job.role}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=400&auto=format&fit=crop';
                        }}
                      />
                    </div>
                  )}

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '12px' }}>
                      <div>
                        <h4 style={{ fontSize: isMobile ? '16px' : '18px', color: '#4A3B32', fontWeight: 700, marginBottom: '6px', letterSpacing: '-0.01em' }}>
                          {job.role}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px 12px' : '16px', flexWrap: 'wrap', color: '#6A5D54', fontSize: '13px' }}>
                          <span style={{ fontWeight: 600 }}>{job.company}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} /> {job.location}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><DollarSign size={12} /> {job.salary}</span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', background: '#E8E3DA', padding: '8px 16px', borderRadius: '12px', border: '1px solid #DCD6CD' }}>
                        <div style={{ color: '#4A3B32', fontWeight: 800, fontSize: '20px', lineHeight: '1.2' }}>{job.matchPct}%</div>
                        <div style={{ color: '#6A5D54', fontSize: '9px', display: 'flex', alignItems: 'center', gap: '3px', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
                          <Sparkles size={9} /> Match
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #DCD6CD', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {(job.techStack || []).slice(0, 4).map(tech => (
                          <span key={tech} style={{ background: '#F5F2EC', color: '#6A5D54', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #DCD6CD' }}>
                            <Code2 size={10} /> {tech}
                          </span>
                        ))}
                      </div>
                      
                      {job.url && (
                        <span style={{ color: '#C48B57', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Apply Externally <ExternalLink size={12} />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Premium AI Loading Animation */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: jobs.length > 0 ? '24px' : '60px 0',
                  gap: '20px',
                  color: 'var(--primary)',
                  textAlign: 'center',
                  border: '1px dashed rgba(196, 139, 87, 0.25)',
                  background: 'rgba(196, 139, 87, 0.04)',
                  borderRadius: '16px',
                  marginTop: jobs.length > 0 ? '16px' : '20px',
                  width: '100%',
                }}
              >
                {/* AI Pulsing Glow & Orbiting Rings */}
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-orange-500/10 blur-md animate-pulse"></div>
                  <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-500/40 animate-spin"></div>
                  <div className="absolute w-10 h-10 rounded-full border border-dotted border-orange-400/30 animate-spin"></div>
                  <Sparkles className="text-amber-500 w-6 h-6 animate-bounce" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className="text-base font-bold text-amber-500 tracking-wide animate-pulse">
                    {jobs.length > 0 ? `${jobs.length} result${jobs.length !== 1 ? 's' : ''} found — still searching...` : 'Searching live job boards...'}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--on-surface-variant)', maxWidth: '420px', margin: '0 auto', lineHeight: 1.4 }}>
                    {statusMessage || 'Scanning sources in real-time. Results appear as they are found.'}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Find More / End of Results */}
          {!loading && isDone && searched && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '20px 0' }}
            >
              {reachedCap ? (
                <button
                  id="find-more-btn"
                  type="button"
                  onClick={handleFindMore}
                  style={{
                    background: 'var(--primary)',
                    color: 'var(--on-primary)',
                    border: 'none',
                    padding: '12px 28px',
                    borderRadius: '9999px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 20px rgba(74, 59, 50, 0.15)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <RefreshCw size={14} /> Find More {category === 'internship' ? 'Internships' : category === 'meetup' ? 'Events' : category === 'hackathon' ? 'Hackathons' : 'Jobs'}
                </button>
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', textAlign: 'center' }}>
                  {jobs.length === 0 ? '' : "That's all we found for this search. Adjust keywords or check back soon!"}
                </p>
              )}
            </motion.div>
          )}

          {!loading && jobs.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '12px', color: 'var(--on-surface-variant)', textAlign: 'center' }}
            >
              <Briefcase size={36} style={{ opacity: 0.4 }} />
              <div style={{ fontSize: '14px', fontWeight: 500 }}>No matching jobs found.</div>
              <div style={{ fontSize: '12px', maxWidth: '300px' }}>Try adjusting your keywords, experience filter, or location details.</div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}


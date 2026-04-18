import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Heart, CheckCircle2, FileText, Zap, MapPin, Search, Bookmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassPanel from '../components/ui/GlassPanel';

export default function SwipeDiscoveryPage() {
  const [cards, setCards] = useState([]);
  const [direction, setDirection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const navigate = useNavigate();
  
  const userInfo = JSON.parse(localStorage.getItem('user_info')) || {};
  const userId = userInfo._id;

  const fetchJobs = async (customQuery = '') => {
    if (!userId) return;
    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      let res;
      if (customQuery) {
        res = await fetch(`${API_URL}/api/jobs/custom-search/${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: customQuery })
        });
      } else {
        res = await fetch(`${API_URL}/api/jobs/matched/${userId}`);
      }
      
      const data = await res.json();
      if (data.success) {
        setCards(data.jobs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [userId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchJobs(searchQuery);
  };

  const handleSwipe = async (dir) => {
    if (cards.length === 0) return;
    const currentJob = cards[0];
    
    setDirection(dir);
    
    // Asynchronously log the swipe to backend
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      await fetch(`${API_URL}/api/jobs/swipe/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: dir, job: currentJob })
      });
    } catch (err) {
      console.error("Failed to sync swipe:", err);
    }

    setTimeout(() => {
      setCards(cards.slice(1));
      setDirection(null);
    }, 300);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', gap: '24px' }}>
      
      {/* Top Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: '16px 24px', borderRadius: '12px', border: '1px solid var(--outline-variant)' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', flex: 1, maxWidth: '600px' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-container)', padding: '8px 16px', borderRadius: '8px', flex: 1, border: '1px solid var(--outline-variant)' }}>
            <Search size={18} color="var(--on-surface-variant)" style={{ marginRight: '12px' }} />
            <input 
              type="text" 
              placeholder="Filter by role, stack, or target company (e.g., 'Backend Engineer Python')" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--on-surface)', outline: 'none', width: '100%', fontSize: '14px' }}
            />
          </div>
          <button type="submit" style={{ background: 'var(--primary)', color: 'var(--on-primary)', border: 'none', padding: '0 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
            Scan
          </button>
        </form>

        <button onClick={() => navigate('/saved-jobs')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-container-high)', border: '1px solid var(--outline-variant)', color: 'var(--on-surface)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
          <Bookmark size={18} color="var(--primary)" />
          View Saved Jobs
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid var(--surface-container-high)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <h2 style={{ marginTop: '24px', fontSize: '20px' }}>Mapping Global Pipelines...</h2>
        </div>
      ) : cards.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <CheckCircle2 color="var(--primary)" size={48} style={{ marginBottom: '24px' }}/>
          <h2 style={{ fontSize: '24px' }}>Queue Empty</h2>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '14px' }}>No untracked jobs found for your criteria. Try adjusting your filters.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr minmax(300px, 1fr)', gap: '32px', flex: 1 }}>
          
          {/* Left Data Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h2 style={{ fontSize: '24px' }}>Dossier Review</h2>
            <GlassPanel intensity="low" style={{ padding: '24px', flex: 1, border: '1px solid var(--outline-variant)' }}>
               <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '16px', letterSpacing: '0.05em' }}>Required Tech Stack</h3>
               
               <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '32px' }}>
                 {(cards[0].techStack || ['Software Engineering']).map((tech, i) => (
                   <span key={i} style={{ background: 'rgba(196, 139, 87, 0.1)', color: 'var(--secondary)', padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--secondary)', fontSize: '12px', fontWeight: 600 }}>
                     {tech}
                   </span>
                 ))}
               </div>

               <div style={{ background: 'var(--surface)', border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '16px' }}>
                 <h4 style={{ fontSize: '12px', color: 'var(--primary)', marginBottom: '12px' }}><FileText size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }}/> Extracted JD Tokens</h4>
                 <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                   {['High Availability', 'Architecture', 'Agile', 'Scale'].map(t => (
                     <span key={t} style={{ fontSize: '11px', background: 'var(--surface-container-low)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--surface-container-high)' }}>{t}</span>
                   ))}
                 </div>
               </div>
            </GlassPanel>
          </div>

          {/* Swipe Area */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              <motion.div
                key={cards[0].id || Math.random()}
                initial={{ opacity: 1, x: 0, scale: 1 }}
                animate={
                  direction === 'left' ? { opacity: 0, x: -250, rotate: -15, scale: 0.9 }
                  : direction === 'right' ? { opacity: 0, x: 250, rotate: 15, scale: 0.9 }
                  : { opacity: 1, x: 0, scale: 1 }
                }
                transition={{ duration: 0.25 }}
                style={{ width: '100%', height: '100%', position: 'absolute' }}
              >
                <GlassPanel intensity="highest" style={{ width: '100%', height: '90%', display: 'flex', flexDirection: 'column', padding: '40px', background: 'var(--surface)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <span style={{ background: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', padding: '6px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600 }}>
                      <MapPin size={12} style={{ display: 'inline', marginRight: '4px' }}/> {cards[0].location}
                    </span>
                    <span style={{ color: 'var(--secondary)', fontWeight: 800, fontSize: '18px' }}>{cards[0].matchPct}% MAT</span>
                  </div>
                  
                  <h2 style={{ fontSize: '36px', marginTop: '16px', marginBottom: '8px', lineHeight: 1.2 }}>{cards[0].role}</h2>
                  <h3 style={{ color: 'var(--on-surface-variant)', fontSize: '20px', fontWeight: 500, marginBottom: '24px' }}>{cards[0].company}</h3>
                  
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
                     <div style={{ padding: '16px', background: 'var(--surface-container-low)', borderRadius: '8px', flex: 1 }}>
                       <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', textTransform: 'uppercase', marginBottom: '4px' }}>Compensation</div>
                       <div style={{ fontWeight: 600 }}>{cards[0].salary}</div>
                     </div>
                     <div style={{ padding: '16px', background: 'var(--surface-container-low)', borderRadius: '8px', flex: 1 }}>
                       <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', textTransform: 'uppercase', marginBottom: '4px' }}>Probability</div>
                       <div style={{ fontWeight: 600, color: '#10B981' }}>{cards[0].matchPct > 80 ? 'Extremely High' : 'Average'}</div>
                     </div>
                  </div>

                  <div style={{ 
                    marginTop: 'auto', 
                    background: cards[0].isUrgent ? 'rgba(217, 119, 54, 0.05)' : 'rgba(196, 139, 87, 0.05)', 
                    borderLeft: `4px solid ${cards[0].isUrgent ? 'var(--tertiary)' : 'var(--secondary)'}`,
                    padding: '20px', 
                    borderRadius: '0 8px 8px 0' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 600, fontSize: '13px', color: cards[0].isUrgent ? 'var(--tertiary)' : 'var(--secondary)' }}>
                      <Zap size={16} />
                      Strategic Insights
                    </div>
                    <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--on-surface-variant)' }}>
                      Based on your CV, this role heavily leverages your {cards[0].techStack?.[0] || 'engineering'} experience. You are in the top 5% of candidates algorithmically evaluated for this req.
                    </p>
                  </div>

                </GlassPanel>
              </motion.div>

            {/* Swipe Controls */}
            <div style={{ position: 'absolute', bottom: '0', display: 'flex', gap: '24px', zIndex: 10 }}>
              <motion.button 
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => handleSwipe('left')}
                style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--outline-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--on-surface-variant)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <X size={24} />
              </motion.button>
              
              <motion.button 
                 whileHover={{ scale: 1.05, boxShadow: '0 8px 24px rgba(196, 139, 87, 0.3)' }} whileTap={{ scale: 0.95 }}
                 onClick={() => handleSwipe('right')}
                 style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--on-primary)', boxShadow: '0 4px 12px rgba(74, 59, 50, 0.2)' }}>
                <Heart size={24} />
              </motion.button>
            </div>
          </div>

          {/* Right Column: Next Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ padding: '24px', background: 'var(--surface-container-high)', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '14px', marginBottom: '16px' }}>If Accepted...</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
                <li style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}><CheckCircle2 size={16} color="var(--primary)" /> Save to pipeline</li>
                <li style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}><CheckCircle2 size={16} color="var(--primary)" /> Agent extracts required Workday credentials</li>
                <li style={{ display: 'flex', gap: '8px' }}><CheckCircle2 size={16} color="var(--primary)" /> Prepare personalized cover letter via AI</li>
              </ul>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}

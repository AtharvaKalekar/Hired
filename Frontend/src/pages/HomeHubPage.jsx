import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Target, CalendarDays, Users, ChevronRight, Sparkles, Code2, MapPin, DollarSign, Activity, Clock, Tag, ExternalLink } from 'lucide-react';
import GlassPanel from '../components/ui/GlassPanel';
import GlowingButton from '../components/ui/GlowingButton';
import { useNavigate } from 'react-router-dom';

export default function HomeHubPage() {
  const [activeTab, setActiveTab] = useState('Jobs');
  const [jobs, setJobs] = useState([]);
  const [internships, setInternships] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const userInfo = JSON.parse(localStorage.getItem('user_info')) || {};
  const userId = userInfo._id;
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        if (!userId) { setLoading(false); return; }
        const res = await fetch(`${API_URL}/api/jobs/matched/${userId}`);
        const data = await res.json();
        if (data.success) setJobs(data.jobs);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchJobs();
  }, []);

  useEffect(() => {
    if (activeTab === 'Internships' && internships.length === 0) {
      setLoading(true);
      const fetchInternships = async () => {
        try {
          if (!userId) { setLoading(false); return; }
          const res = await fetch(`${API_URL}/api/jobs/internships/${userId}`);
          const data = await res.json();
          if (data.success) setInternships(data.internships);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
      };
      fetchInternships();
    }
    if (activeTab === 'Events' && events.length === 0) {
      setLoading(true);
      const fetchEvents = async () => {
        try {
          const res = await fetch(`${API_URL}/api/jobs/events`);
          const data = await res.json();
          if (data.success) setEvents(data.events);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
      };
      fetchEvents();
    }
  }, [activeTab]);

  const tabs = ['Jobs', 'Internships', 'Events'];

  const MatchCard = ({ role, company, matchPct, isUrgent, salary, location, techStack, url }) => (
    <motion.div 
      whileHover={{ scale: 1.01, boxShadow: '0 8px 32px rgba(74, 59, 50, 0.08)' }}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--outline-variant)',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        marginBottom: '16px',
        position: 'relative',
        overflow: 'hidden'
      }}
      onClick={() => url ? window.open(url, '_blank') : navigate('/swipe')}
    >
      {isUrgent && <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--tertiary)' }} />}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h4 style={{ fontSize: '18px', color: 'var(--primary)', letterSpacing: '-0.01em' }}>{role}</h4>
            {isUrgent && <span style={{ background: 'var(--surface-container)', color: 'var(--tertiary)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, border: '1px solid rgba(217, 119, 54, 0.2)' }}>FAST TRACK</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--on-surface-variant)', fontSize: '13px' }}>
            <span style={{ fontWeight: 600 }}>{company}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12}/> {location}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><DollarSign size={12}/> {salary}</span>
          </div>
        </div>
        
        <div style={{ textAlign: 'right', background: 'var(--surface-container-high)', padding: '8px 12px', borderRadius: '8px' }}>
          <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '18px' }}>{matchPct}%</div>
          <div style={{ color: 'var(--on-surface-variant)', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Sparkles size={10}/> Match
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {(techStack || []).map(tech => (
           <span key={tech} style={{ background: 'var(--surface-container)', color: 'var(--on-surface-variant)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
             <Code2 size={12} /> {tech}
           </span>
        ))}
      </div>
    </motion.div>
  );

  const InternCard = ({ title, company, location, stipend, duration, techStack, url, matchPct }) => (
    <motion.div 
      whileHover={{ scale: 1.01, boxShadow: '0 8px 32px rgba(74, 59, 50, 0.08)' }}
      style={{ background: 'var(--surface)', border: '1px solid var(--outline-variant)', borderRadius: '12px', padding: '20px', cursor: 'pointer', marginBottom: '16px', position: 'relative', overflow: 'hidden' }}
      onClick={() => url && window.open(url, '_blank')}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--secondary)' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <h4 style={{ fontSize: '18px', color: 'var(--primary)', marginBottom: '4px' }}>{title}</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--on-surface-variant)', fontSize: '13px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600 }}>{company}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12}/> {location}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><DollarSign size={12}/> {stipend}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12}/> {duration}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', background: 'rgba(16, 185, 129, 0.08)', padding: '8px 12px', borderRadius: '8px' }}>
          <div style={{ color: '#10B981', fontWeight: 800, fontSize: '18px' }}>{matchPct}%</div>
          <div style={{ color: 'var(--on-surface-variant)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Match</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {(techStack || []).map(tech => (
          <span key={tech} style={{ background: 'var(--surface-container)', color: 'var(--on-surface-variant)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Code2 size={12} /> {tech}
          </span>
        ))}
      </div>
    </motion.div>
  );

  const EventCard = ({ title, organizer, date, location, type, url, description }) => (
    <motion.div 
      whileHover={{ scale: 1.01, boxShadow: '0 8px 32px rgba(74, 59, 50, 0.08)' }}
      style={{ background: 'var(--surface)', border: '1px solid var(--outline-variant)', borderRadius: '12px', padding: '20px', cursor: 'pointer', marginBottom: '16px', position: 'relative', overflow: 'hidden' }}
      onClick={() => url && window.open(url, '_blank')}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: type === 'Hackathon' ? '#F59E0B' : type === 'Workshop' ? '#8B5CF6' : '#3B82F6' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <h4 style={{ fontSize: '18px', color: 'var(--primary)', marginBottom: '4px' }}>{title}</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--on-surface-variant)', fontSize: '13px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600 }}>{organizer}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CalendarDays size={12}/> {date}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12}/> {location}</span>
          </div>
        </div>
        <span style={{ background: type === 'Hackathon' ? 'rgba(245,158,11,0.1)' : type === 'Workshop' ? 'rgba(139,92,246,0.1)' : 'rgba(59,130,246,0.1)', color: type === 'Hackathon' ? '#F59E0B' : type === 'Workshop' ? '#8B5CF6' : '#3B82F6', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
          {type}
        </span>
      </div>
      {description && <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', lineHeight: 1.5, marginBottom: '12px' }}>{description}</p>}
      {url && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--secondary)', fontWeight: 600 }}>
          <ExternalLink size={12} /> Register / Learn More
        </div>
      )}
    </motion.div>
  );

  const ActivityFeedItem = ({ title, desc, time, isPending }) => (
    <div style={{ paddingLeft: '24px', position: 'relative', marginBottom: '24px' }}>
      <div style={{ position: 'absolute', left: '-5px', top: '2px', width: '10px', height: '10px', borderRadius: '5px', background: isPending ? 'var(--surface-container-high)' : 'var(--secondary)', border: '2px solid var(--surface)' }} />
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)', marginBottom: '4px' }}>{title}</div>
      <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginBottom: '8px', lineHeight: 1.5 }}>{desc}</div>
      <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', fontFamily: 'JetBrains Mono' }}>{time}</div>
    </div>
  );

  const getTabHeading = () => {
    if (activeTab === 'Jobs') return 'Algorithmically Curated Roles';
    if (activeTab === 'Internships') return 'Matched Internship Programs';
    if (activeTab === 'Events') return 'Tech Events & Hackathons';
    return '';
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: '13px' }}>
          <Sparkles size={16} style={{ display: 'block', margin: '0 auto 8px auto', color: 'var(--tertiary)', animation: 'pulse 1.5s infinite' }}/>
          Mining Open Opportunities via Engine...
        </div>
      );
    }

    if (activeTab === 'Jobs') {
      return jobs.length > 0 ? jobs.map((job) => (
        <MatchCard key={job.id} role={job.role} company={job.company} matchPct={job.matchPct} isUrgent={job.isUrgent} salary={job.salary} location={job.location} techStack={job.techStack} url={job.url} />
      )) : <div style={{ padding: '20px', color: 'var(--on-surface-variant)', fontSize: '13px', textAlign: 'center' }}>No matched opportunities found.</div>;
    }

    if (activeTab === 'Internships') {
      return internships.length > 0 ? internships.map((intern) => (
        <InternCard key={intern.id} {...intern} />
      )) : <div style={{ padding: '20px', color: 'var(--on-surface-variant)', fontSize: '13px', textAlign: 'center' }}>No internships found in your region.</div>;
    }

    if (activeTab === 'Events') {
      return events.length > 0 ? events.map((evt) => (
        <EventCard key={evt.id} {...evt} />
      )) : <div style={{ padding: '20px', color: 'var(--on-surface-variant)', fontSize: '13px', textAlign: 'center' }}>No upcoming events found.</div>;
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 2.5fr 1.2fr', gap: '32px' }}>
      
      {/* Column 1: Stats & Navigation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h2 style={{ fontSize: '28px' }}>Opportunity Hub</h2>
        
        <GlassPanel intensity="low" style={{ padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Profile Strength Vectors</div>
          
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}><span>Backend Architecture</span> <span>94%</span></div>
            <div style={{ height: '4px', background: 'var(--surface-container-high)', borderRadius: '2px' }}><div style={{ width: '94%', height: '100%', background: 'var(--secondary)' }}/></div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}><span>React / FE Setup</span> <span>88%</span></div>
            <div style={{ height: '4px', background: 'var(--surface-container-high)', borderRadius: '2px' }}><div style={{ width: '88%', height: '100%', background: 'var(--secondary)' }}/></div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}><span>System Design</span> <span>72%</span></div>
            <div style={{ height: '4px', background: 'var(--surface-container-high)', borderRadius: '2px' }}><div style={{ width: '72%', height: '100%', background: 'var(--tertiary)' }}/></div>
          </div>
        </GlassPanel>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--outline-variant)', borderRadius: '12px', overflow: 'hidden' }}>
           {['Active Job Search', 'Passive Discovery', 'Interview Prep'].map((mode, i) => (
             <div key={mode} style={{ padding: '16px 20px', borderBottom: i !== 2 ? '1px solid var(--outline-variant)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: i === 0 ? 'var(--surface-container)' : 'transparent' }}>
               <span style={{ fontSize: '13px', fontWeight: i === 0 ? 600 : 500, color: i === 0 ? 'var(--primary)' : 'var(--on-surface-variant)' }}>{mode}</span>
               {i === 0 && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--tertiary)', boxShadow: '0 0 8px rgba(217, 119, 54, 0.4)' }} />}
             </div>
           ))}
        </div>
      </div>

      {/* Column 2: Main Feed */}
      <div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'var(--surface-container-low)', padding: '6px', borderRadius: '12px', display: 'inline-flex', border: '1px solid var(--outline-variant)' }}>
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? 'var(--surface)' : 'transparent',
                color: activeTab === tab ? 'var(--primary)' : 'var(--on-surface-variant)',
                boxShadow: activeTab === tab ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                border: 'none', padding: '8px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s ease'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', color: 'var(--on-surface-variant)' }}>{getTabHeading()}</h3>
          {activeTab === 'Jobs' && (
            <span onClick={() => navigate('/swipe')} style={{ color: 'var(--tertiary)', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <Activity size={14}/> Enter Swiper Mode
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {renderContent()}
        </div>
      </div>

      {/* Column 3: Active Intelligence Feed */}
      <div>
         <div style={{ background: 'var(--surface)', border: '1px solid var(--outline-variant)', borderRadius: '12px', padding: '24px', height: '100%' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
              Active Intelligence
            </h3>
            
            <div style={{ position: 'relative', borderLeft: '1px solid var(--surface-container-high)', marginLeft: '4px' }}>
               <ActivityFeedItem 
                 title="Application Submitted" 
                 desc="Agent successfully filled Meta's Workday portal for 'Sr. Backend Role'." 
                 time="Just now" 
               />
               <ActivityFeedItem 
                 title="Referral Request Drafted" 
                 desc="Drafted an introduction email to Sarah Jenkins at Deloitte." 
                 time="45 mins ago" 
               />
               <ActivityFeedItem 
                 title="Market Scan Complete" 
                 desc="Analyzed 4,203 open roles. 12 added to your discovery queue." 
                 time="2 hours ago" 
               />
               <ActivityFeedItem 
                 title="Portfolio Analysis" 
                 desc="Your latest GitHub repo (Node-Cache) boosted your backend match probability by 4%." 
                 time="Yesterday, 14:20" 
                 isPending
               />
            </div>

            <GlowingButton style={{ width: '100%', marginTop: '32px', fontSize: '13px', padding: '10px' }}>
              Open Command Center
            </GlowingButton>
         </div>
      </div>

    </div>
  );
}

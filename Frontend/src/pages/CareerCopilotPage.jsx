import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, User, Send, Linkedin, ExternalLink, Copy, Check,
  Search, Building2, Briefcase, MapPin, Users, Sparkles,
  RefreshCw, ChevronRight, MessageSquare, X
} from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5001') + '/api';

// ─── Sub-components ──────────────────────────────────────────────────────────

function ProfileCard({ profile, role, company, userName, onGenerateReferral }) {
  const isMobile = useIsMobile();
  const [generating, setGenerating] = useState(false);
  const [referralMsg, setReferralMsg] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/copilot/referral`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, role, company, userName })
      });
      const data = await res.json();
      if (data.success) setReferralMsg(data.message);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(referralMsg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--surface-container)',
        border: '1px solid var(--outline-variant)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      {/* Card header */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px', alignItems: isMobile ? 'stretch' : 'flex-start' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <img
            src={profile.avatar}
            alt={profile.name}
            style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0, border: '2px solid var(--outline-variant)' }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--on-surface)', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile.name}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)', lineHeight: 1.4 }}>
              {profile.role}
            </div>
          </div>
        </div>
        
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: isMobile ? '0' : '60px' }}>
          {profile.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--on-surface-variant)' }}>
              <MapPin size={10} />
              {profile.location}
            </div>
          )}
          {profile.connections && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--on-surface-variant)' }}>
              <Users size={10} />
              {profile.connections}
            </div>
          )}
        </div>

        <a
          href={profile.linkedinUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '6px 10px', borderRadius: '6px',
            background: '#0A66C2', color: 'white',
            fontSize: '11px', fontWeight: 600, textDecoration: 'none',
            flexShrink: 0, whiteSpace: 'nowrap',
            alignSelf: isMobile ? 'stretch' : 'flex-start'
          }}
        >
          <Linkedin size={12} /> View
        </a>
      </div>

      {/* Snippet */}
      <div style={{ padding: '0 16px 12px', fontSize: '11px', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
        {profile.snippet?.slice(0, 140)}{profile.snippet?.length > 140 ? '...' : ''}
      </div>

      {/* Referral section */}
      {!referralMsg ? (
        <div style={{ padding: '0 16px 16px' }}>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: '6px',
              background: generating ? 'var(--surface-container-high)' : 'linear-gradient(135deg, var(--primary), var(--secondary))',
              border: 'none', color: generating ? 'var(--on-surface-variant)' : 'white',
              fontSize: '12px', fontWeight: 600, cursor: generating ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            {generating ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Drafting...</> : <><Sparkles size={12} /> Draft Referral Message</>}
          </button>
        </div>
      ) : (
        <div style={{ borderTop: '1px solid var(--outline-variant)', padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MessageSquare size={11} /> AI-Drafted Message
            </div>
            <button
              onClick={handleCopy}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                background: copied ? '#10B981' : 'var(--surface-container-high)',
                border: '1px solid var(--outline-variant)',
                padding: '4px 8px', borderRadius: '4px',
                fontSize: '11px', cursor: 'pointer',
                color: copied ? 'white' : 'var(--on-surface-variant)',
                transition: 'all 0.2s'
              }}
            >
              {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
            </button>
          </div>
          <div style={{
            background: 'var(--surface-container-low)',
            border: '1px solid var(--outline-variant)',
            borderRadius: '6px',
            padding: '12px',
            fontSize: '12px',
            lineHeight: 1.7,
            color: 'var(--on-surface)',
            whiteSpace: 'pre-wrap',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {referralMsg}
          </div>
          <a
            href={profile.linkedinUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              marginTop: '8px', padding: '8px', borderRadius: '6px',
              background: '#0A66C2', color: 'white',
              fontSize: '12px', fontWeight: 600, textDecoration: 'none'
            }}
          >
            <Linkedin size={13} /> Open LinkedIn Profile <ExternalLink size={11} />
          </a>
        </div>
      )}
    </motion.div>
  );
}

function BotMessage({ msg }) {
  if (msg.type === 'profiles_result') {
    return (
      <div style={{ maxWidth: '100%' }}>
        <div style={{
          padding: '12px 16px',
          background: 'var(--surface-container-high)',
          border: '1px solid var(--outline-variant)',
          borderRadius: '8px 8px 0 0',
          fontSize: '13px',
          lineHeight: 1.6,
          color: 'var(--on-surface)',
          marginBottom: '0',
          fontFamily: 'Inter'
        }}>
          {msg.text}
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '8px',
          padding: '12px',
          background: 'var(--surface-container)',
          border: '1px solid var(--outline-variant)',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px'
        }}>
          {msg.profiles.map((p, i) => (
            <ProfileCard
              key={i}
              profile={p}
              role={msg.role}
              company={msg.company}
              userName={msg.userName}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '12px 16px',
      borderRadius: '8px',
      background: 'var(--surface-container-high)',
      border: '1px solid var(--outline-variant)',
      color: 'var(--on-surface)',
      fontSize: '13px',
      lineHeight: 1.6,
      fontFamily: 'Inter',
      whiteSpace: 'pre-wrap'
    }}>
      {msg.text}
    </div>
  );
}

// ─── Intent Parser ────────────────────────────────────────────────────────────

function parseIntent(input) {
  const lower = input.toLowerCase();

  // Extract company
  let company = null;
  const companyPatterns = [
    /(?:at|in|from|@)\s+([A-Z][a-zA-Z0-9\s&.]+?)(?:\s+for|\s+company|\s+inc|\s+ltd|\s*$)/,
    /([A-Z][a-zA-Z0-9\s&.]+?)\s+(?:company|employee|people|team|engineer|manager)/,
  ];
  for (const pattern of companyPatterns) {
    const m = input.match(pattern);
    if (m) { company = m[1].trim(); break; }
  }

  // Common company name extraction (case insensitive)
  const knownCompanies = ['deloitte', 'google', 'amazon', 'microsoft', 'meta', 'apple', 'flipkart', 'infosys', 'tcs', 'wipro', 'accenture', 'uber', 'netflix', 'airbnb', 'stripe', 'razorpay', 'paytm', 'zomato', 'swiggy', 'atlassian', 'salesforce', 'ibm', 'oracle', 'jpmorgan', 'goldman', 'mckinsey', 'bytedance', 'tiktok', 'adobe', 'qualcomm', 'samsung', 'tesla', 'openai', 'anthropic', 'nvidia'];
  for (const cName of knownCompanies) {
    if (lower.includes(cName)) {
      company = cName.charAt(0).toUpperCase() + cName.slice(1);
      // Fix known proper-cased names
      const properNames = { 'Jpmorgan': 'JPMorgan', 'Tcs': 'TCS', 'Ibm': 'IBM', 'Openai': 'OpenAI' };
      if (properNames[company]) company = properNames[company];
      break;
    }
  }

  // Detect referral / find people intent
  const referralKeywords = [
    'referral', 'refer', 'find people', 'people at', 'who works', 'employees at', 'contact at', 'network at',
    'connection', 'connect', 'employee', 'worker', 'staff', 'find me', 'search', 'get me', 'looking for'
  ];
  // If we found a company, we assume it's a referral/search request. Otherwise, check keywords.
  const isReferralIntent = company ? true : referralKeywords.some(k => lower.includes(k));

  // Extract role
  const roleKeywords = ['software engineer', 'frontend', 'backend', 'fullstack', 'full stack', 'data scientist', 'ml engineer', 'product manager', 'pm', 'devops', 'sde', 'swe', 'manager', 'developer', 'engineer', 'analyst', 'designer', 'architect', 'lead', 'intern', 'director', 'vp'];
  let role = null;
  // Try "for X role" pattern
  const forRoleMatch = input.match(/for\s+(?:a\s+)?(?:an\s+)?(.+?)\s+(?:role|position|job|at|in|$)/i);
  if (forRoleMatch) role = forRoleMatch[1].trim();

  if (!role) {
    for (const rk of roleKeywords) {
      if (lower.includes(rk)) { role = rk; break; }
    }
  }

  return { isReferralIntent, company, role };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CareerCopilotPage() {
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      type: 'text',
      text: `👋 Hi! I'm your **Career Copilot**.\n\nI can find LinkedIn profiles of people at your target companies and draft personalized referral messages for you.\n\nTry: _"I want a referral at Deloitte for a software engineer role"_ or _"Find engineers at Google"_`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // Get logged-in user info
  let userName = 'you';
  try {
    const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
    if (userInfo?.name) userName = userInfo.name;
  } catch (e) { }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { id: Date.now(), sender: 'user', type: 'text', text: input };
    setMessages(prev => [...prev, userMsg]);
    const sentInput = input;
    setInput('');
    setLoading(true);

    // Parse intent
    const { isReferralIntent, company, role } = parseIntent(sentInput);

    // Typing indicator
    const typingId = Date.now() + 1;
    setMessages(prev => [...prev, { id: typingId, sender: 'bot', type: 'typing' }]);

    try {
      if (isReferralIntent && company) {
        const resolvedRole = role || 'Software Engineer';

        const res = await fetch(`${API_BASE}/copilot/find-people`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company, role: resolvedRole, userName })
        });
        const data = await res.json();

        setMessages(prev => prev.filter(m => m.id !== typingId));

        if (data.success && data.profiles?.length > 0) {
          setMessages(prev => [...prev, {
            id: Date.now() + 2,
            sender: 'bot',
            type: 'profiles_result',
            text: `✅ Found **${data.profiles.length} LinkedIn profiles** for "${resolvedRole}" at **${company}**. Click "Draft Referral Message" on any card to generate a personalized outreach with AI.`,
            profiles: data.profiles,
            role: resolvedRole,
            company,
            userName
          }]);
        } else {
          setMessages(prev => [...prev, {
            id: Date.now() + 2,
            sender: 'bot',
            type: 'text',
            text: data.message || `No profiles found for "${resolvedRole}" at ${company}. Try a different role title or company name.`
          }]);
        }
      } else if (!company && isReferralIntent) {
        setMessages(prev => prev.filter(m => m.id !== typingId));
        setMessages(prev => [...prev, {
          id: Date.now() + 2,
          sender: 'bot',
          type: 'text',
          text: `I couldn't detect the company name. Could you be more specific? For example:\n• "I want a referral at **Deloitte** for a senior engineer role"\n• "Find **Google** employees working in data science"\n• "People at **Amazon** for a backend developer position"`
        }]);
      } else {
        // General chat fallback
        setMessages(prev => prev.filter(m => m.id !== typingId));
        setMessages(prev => [...prev, {
          id: Date.now() + 2,
          sender: 'bot',
          type: 'text',
          text: `I specialize in finding LinkedIn contacts for referrals. Try:\n\n📌 _"I want a referral at Deloitte for a software engineer"_\n📌 _"Find product managers at Google"_\n📌 _"Who works at Microsoft as a data scientist?"_`
        }]);
      }
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== typingId));
      setMessages(prev => [...prev, {
        id: Date.now() + 2,
        sender: 'bot',
        type: 'text',
        text: `❌ Search failed: ${err.message}. Please check your connection and try again.`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    { label: '🔍 Deloitte SE Referral', query: 'I want a referral at Deloitte for a software engineer role' },
    { label: '🔍 Google DS Contacts', query: 'Find data scientists at Google' },
    { label: '🔍 Microsoft Engineers', query: 'Find software engineers at Microsoft' },
    { label: '🔍 Amazon Backend', query: 'I want a referral for backend developer at Amazon' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: isMobile ? 'calc(100vh - 88px)' : 'calc(100vh - 100px)', gap: '0' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '16px 24px',
        background: 'var(--surface)',
        border: '1px solid var(--outline-variant)',
        borderRadius: '12px 12px 0 0',
        borderBottom: 'none'
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '8px',
          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Bot size={18} color="white" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '15px' }}>Career Copilot</div>
          <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>LinkedIn People Finder · AI Referral Drafter</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: '11px', color: '#10B981' }}>Live</span>
        </div>
      </div>

      {/* Messages area */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '24px',
        background: 'var(--bg)',
        border: '1px solid var(--outline-variant)',
        borderTop: 'none', borderBottom: 'none',
        display: 'flex', flexDirection: 'column', gap: '20px'
      }}>
        {messages.map(msg => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex',
              gap: '12px',
              alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row',
              maxWidth: msg.type === 'profiles_result' ? '100%' : '85%',
              width: msg.type === 'profiles_result' ? '100%' : undefined
            }}
          >
            {/* Avatar */}
            <div style={{
              width: 30, height: 30, borderRadius: '6px', flexShrink: 0,
              background: msg.sender === 'user' ? 'var(--surface-container)' : 'linear-gradient(135deg, var(--primary), var(--secondary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: msg.sender === 'user' ? '1px solid var(--outline-variant)' : 'none',
              marginTop: '2px'
            }}>
              {msg.sender === 'user'
                ? <User size={14} color="var(--on-surface)" />
                : <Bot size={14} color="white" />
              }
            </div>

            {/* Content */}
            <div style={{ flex: msg.type === 'profiles_result' ? 1 : undefined }}>
              {msg.type === 'typing' ? (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: 'var(--surface-container-high)',
                  border: '1px solid var(--outline-variant)',
                  display: 'flex', gap: '4px', alignItems: 'center'
                }}>
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                      style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }}
                    />
                  ))}
                </div>
              ) : msg.sender === 'user' ? (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: 'var(--surface)',
                  border: '1px solid var(--outline-variant)',
                  color: 'var(--on-surface)',
                  fontSize: '13px', lineHeight: 1.6
                }}>
                  {msg.text}
                </div>
              ) : (
                <BotMessage msg={msg} />
              )}
            </div>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick Prompts */}
      <div style={{
        padding: '10px 16px',
        background: 'var(--surface)',
        border: '1px solid var(--outline-variant)',
        borderTop: 'none', borderBottom: 'none',
        display: 'flex', gap: '8px', overflowX: 'auto',
        scrollbarWidth: 'none'
      }}>
        {quickPrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => { setInput(p.query); }}
            style={{
              padding: '5px 12px', borderRadius: '20px',
              background: 'var(--surface-container)',
              border: '1px solid var(--outline-variant)',
              color: 'var(--on-surface-variant)',
              fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.color = 'var(--primary)'; }}
            onMouseLeave={e => { e.target.style.borderColor = 'var(--outline-variant)'; e.target.style.color = 'var(--on-surface-variant)'; }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div style={{
        padding: '16px 20px',
        background: 'var(--surface)',
        border: '1px solid var(--outline-variant)',
        borderRadius: '0 0 12px 12px',
        borderTop: '1px solid var(--outline-variant)'
      }}>
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{
              position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
              color: 'var(--on-surface-variant)', pointerEvents: 'none'
            }} />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='e.g. "I want a referral at Deloitte for a software engineer role"'
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 16px 12px 36px',
                borderRadius: '8px',
                background: 'var(--surface-container)',
                border: '1px solid var(--outline-variant)',
                color: 'var(--on-surface)',
                fontSize: '13px',
                outline: 'none',
                transition: 'border 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--outline-variant)'}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || loading}
            style={{
              padding: '12px 20px',
              borderRadius: '8px',
              background: (!input.trim() || loading) ? 'var(--surface-container)' : 'linear-gradient(135deg, var(--primary), var(--secondary))',
              border: 'none',
              color: (!input.trim() || loading) ? 'var(--on-surface-variant)' : 'white',
              cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '13px', fontWeight: 600,
              transition: 'all 0.2s', flexShrink: 0
            }}
          >
            {loading
              ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Searching...</>
              : <><Send size={14} /> Search</>
            }
          </button>
        </form>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}

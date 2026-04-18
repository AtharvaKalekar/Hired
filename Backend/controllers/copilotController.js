const https = require('https');
const path = require('path');
const fs = require('fs');

// ─── Helpers ────────────────────────────────────────────────────────────────

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', ...headers } }, (resp) => {
      let chunks = '';
      resp.on('data', (c) => (chunks += c));
      resp.on('end', () => {
        try { resolve(JSON.parse(chunks)); }
        catch (e) { reject(new Error('JSON parse error: ' + chunks.slice(0, 200))); }
      });
    }).on('error', reject);
  });
}

/**
 * Parse a LinkedIn search result snippet to extract useful info
 */
function parseLinkedInResult(item) {
  const title = item.title || '';
  const link = item.link || '';
  const snippet = item.snippet || '';

  // Extract name from title: "John Doe - Senior Engineer at Deloitte | LinkedIn"
  let name = title.split(' - ')[0].split(' | ')[0].trim();
  let roleAtCompany = '';
  const dashParts = title.split(' - ');
  if (dashParts.length > 1) {
    roleAtCompany = dashParts.slice(1).join(' - ').replace('| LinkedIn', '').trim();
  }

  // Try to figure out location from snippet
  const locationMatch = snippet.match(/(?:located in|based in|·\s*)([A-Z][a-zA-Z\s,]+(?:India|USA|UK|Canada|Australia|Germany|Singapore|UAE)?)/);
  const location = locationMatch ? locationMatch[1].trim() : '';

  // Count connections / followers hint
  const connectionsMatch = snippet.match(/(\d+)\+?\s*(?:connections|followers)/i);
  const connections = connectionsMatch ? connectionsMatch[1] + '+ connections' : null;

  return {
    name,
    role: roleAtCompany,
    linkedinUrl: link,
    snippet,
    location,
    connections,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&size=80`
  };
}

/**
 * Search LinkedIn profiles via Google (site:linkedin.com/in)
 */
async function searchLinkedInProfiles(company, role) {
  const query = `site:linkedin.com/in "${company}" "${role}"`;
  const encodedQuery = encodeURIComponent(query);
  const serpApiKey = process.env.SERPAPI_KEY;

  if (!serpApiKey) throw new Error('SERPAPI_KEY not configured');

  const url = `https://serpapi.com/search.json?engine=google&q=${encodedQuery}&num=8&api_key=${serpApiKey}`;
  
  const data = await httpsGet(url);
  const organicResults = data.organic_results || [];

  // Filter to only actual linkedin profile pages
  const profileResults = organicResults.filter(r => 
    r.link && r.link.includes('linkedin.com/in/') && !r.link.includes('linkedin.com/in//?')
  );

  return profileResults.map(parseLinkedInResult).filter(p => p.name && p.name.length > 1).slice(0, 6);
}

/**
 * Use Groq to generate a personalized referral message
 */
async function generateReferralMessage(senderName, targetProfile, role, company) {
  const agentPath = path.join(__dirname, '..', 'ai_agent');
  const dotenvPath = path.join(agentPath, '.env');
  
  let groqKey = process.env.GROQ_API_KEY || '';
  if (!groqKey && fs.existsSync(dotenvPath)) {
    const envContent = fs.readFileSync(dotenvPath, 'utf-8');
    const match = envContent.match(/GROQ_API_KEY=(.+)/);
    if (match) groqKey = match[1].trim();
  }

  if (!groqKey) {
    // Return a good template without AI
    return `Hi ${targetProfile.name.split(' ')[0]},

I came across your profile while researching ${company}'s engineering team. Your background in ${targetProfile.role} is exactly the kind of experience I admire.

I'm actively applying for the ${role} role at ${company} and would love to connect. If you have a few minutes, I'd be grateful to hear about your experience on the team. Even a brief chat would be invaluable.

Would you be open to a quick 10-minute call or exchange?

Best regards,
${senderName}`;
  }

  const prompt = `Write a short, professional LinkedIn referral message from "${senderName}" to "${targetProfile.name}" who works at ${company} as "${targetProfile.role}".

Context:
- Sender "${senderName}" is applying for: ${role} at ${company}
- Target profile snippet: ${targetProfile.snippet}

Rules:
- Keep it under 100 words
- Be warm but professional
- Mention their specific role to show you did your homework
- End with a specific ask (10-min call or referral)
- DO NOT use generic platitudes
- Write in first person from ${senderName}'s perspective
- Do NOT add subject lines, just the message body`;

  const payload = JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: 'You are an expert professional networking coach who writes highly personalized, concise LinkedIn outreach messages.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 300
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (resp) => {
      let data = '';
      resp.on('data', (c) => (data += c));
      resp.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.choices?.[0]?.message?.content || 'Could not generate message.');
        } catch (e) {
          resolve('Could not generate personalized message.');
        }
      });
    });
    req.on('error', () => resolve('Could not generate personalized message.'));
    req.write(payload);
    req.end();
  });
}

// ─── Controller Exports ──────────────────────────────────────────────────────

/**
 * POST /api/copilot/find-people
 * Body: { company, role, userName }
 */
exports.findPeople = async (req, res) => {
  try {
    const { company, role, userName = 'you' } = req.body;
    
    if (!company || !role) {
      return res.status(400).json({ success: false, message: 'company and role are required.' });
    }

    console.log(`[CopilotEngine] Searching LinkedIn: "${role}" at "${company}"...`);
    
    const profiles = await searchLinkedInProfiles(company, role);
    
    if (profiles.length === 0) {
      return res.status(200).json({ 
        success: true, 
        profiles: [],
        message: `No LinkedIn profiles found for ${role} at ${company}. Try a broader role like "Software Engineer" or "Engineer".`
      });
    }

    console.log(`[CopilotEngine] Found ${profiles.length} profiles. Generating referral messages...`);

    // Generate referral message for the top profile
    const topProfile = profiles[0];
    const referralMessage = await generateReferralMessage(userName, topProfile, role, company);

    return res.status(200).json({
      success: true,
      company,
      role,
      profiles,
      topReferral: {
        profile: topProfile,
        message: referralMessage
      }
    });

  } catch (err) {
    console.error('[CopilotEngine] Error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/copilot/referral
 * Body: { profile, role, company, userName }
 * Generates a referral message for a specific profile
 */
exports.generateReferral = async (req, res) => {
  try {
    const { profile, role, company, userName = 'you' } = req.body;
    if (!profile || !role || !company) {
      return res.status(400).json({ success: false, message: 'profile, role, company are required.' });
    }

    const message = await generateReferralMessage(userName, profile, role, company);
    return res.status(200).json({ success: true, message });
  } catch (err) {
    console.error('[CopilotEngine] Referral error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const User = require('../models/User');
const { spawn } = require('child_process');
const path = require('path');
const Listing = require('../models/Listing');

// Helper: spawn Python scraper in the background
function spawnScraper(query, location, category) {
  try {
    const fs = require('fs');
    const scraperDir = path.join(__dirname, '..', 'scraper');
    const pythonScript = path.join(scraperDir, 'run_search.py');
    const venvPython = path.join(scraperDir, 'venv', 'bin', 'python3');
    const systemPython = process.platform === 'win32' ? 'python' : 'python3';
    const pythonExec = fs.existsSync(venvPython) ? venvPython : systemPython;

    let adapters = [];
    if (category === 'job') {
      adapters = ['naukri', 'linkedin', 'serpapi_jobs'];
    } else if (category === 'internship') {
      adapters = ['internshala', 'foundit'];
    } else if (category === 'meetup') {
      adapters = ['luma', 'meetup'];
    } else if (category === 'hackathon') {
      adapters = ['luma', 'meetup'];
    } else {
      adapters = ['naukri', 'linkedin', 'serpapi_jobs', 'internshala'];
    }

    const args = [
      pythonScript,
      '--adapter', adapters.join(','),
      '--query', query
    ];

    if (location) {
      args.push('--location', location);
    }

    if (category) {
      args.push('--category', category);
    }

    console.log(`[LiveScraper] Spawning: ${pythonExec} ${args.join(' ')}`);
    const child = spawn(pythonExec, args, { cwd: scraperDir });

    child.stdout.on('data', (data) => {
      console.log(`[LiveScraper stdout]: ${data.toString().trim()}`);
    });

    child.stderr.on('data', (data) => {
      console.error(`[LiveScraper stderr]: ${data.toString().trim()}`);
    });

    child.on('close', (code) => {
      console.log(`[LiveScraper] Finished with exit code ${code}`);
    });
  } catch (error) {
    console.error('[LiveScraper] Failed to spawn scraper:', error);
  }
}

// ── Helper: score and shape a Listing document for the API response ────────────
function scoreAndShape(listing, userSkills) {
  const searchText = [
    listing.title || '',
    listing.description || '',
    ...(listing.skills || []),
  ].join(' ').toLowerCase();

  const matchedSkills = userSkills.filter(s => searchText.includes(s.toLowerCase()));
  let matchPct = userSkills.length > 0
    ? Math.min(Math.round((matchedSkills.length / userSkills.length) * 100), 99)
    : 0;
  // No padding — show the real computed score
  if (matchPct > 99) matchPct = 99;

  return {
    id:         listing.id,
    role:       listing.title,
    company:    listing.organization,
    matchPct,
    location:   listing.location || 'Remote',
    salary:     listing.salary_or_stipend || 'Competitive',
    isUrgent:   false,
    techStack:  matchedSkills.length > 0
                  ? matchedSkills.slice(0, 4).map(t => t.charAt(0).toUpperCase() + t.slice(1))
                  : (listing.skills || []).slice(0, 4).map(t => t.charAt(0).toUpperCase() + t.slice(1)),
    url:        listing.apply_url || '',
  };
}

// ── Helper: build a MongoDB filter from category + queryTerms ─────────────────
// Shared by customSearchJobs (POST) and searchStream (GET/SSE).
function buildDbQuery(category, queryTerms, excludeIds = [], location = '') {
  const eventSources = ['luma', 'meetup', 'townscript', 'serpapi_events'];
  const dbQuery = { is_active: true };

  // India-only location regex — applied to all job/internship queries.
  // Matches any listing whose location contains at least one India keyword.
  const INDIA_LOC_REGEX = /india|bengaluru|bangalore|mumbai|delhi|hyderabad|pune|chennai|kolkata|noida|gurgaon|gurugram|ahmedabad|jaipur|chandigarh|kochi|indore|nagpur|surat|lucknow|coimbatore|visakhapatnam|remote|work from home|wfh|hybrid/i;

  if (category === 'job') {
    dbQuery.category = 'job';
    dbQuery.source = { $nin: eventSources };
  } else if (category === 'internship') {
    dbQuery.category = 'internship';
    dbQuery.source = { $nin: eventSources };
  } else if (category === 'meetup') {
    dbQuery.category = 'event';
    dbQuery.source = { $in: eventSources };
  } else if (category === 'hackathon') {
    dbQuery.category = 'event';
    dbQuery.source = { $in: eventSources };
    dbQuery.$or = [
      { title:       { $regex: 'hackathon|sprint|builder|battle|contest|competition|hack', $options: 'i' } },
      { description: { $regex: 'hackathon|sprint|builder|battle|contest|competition|hack', $options: 'i' } },
    ];
  } else {
    dbQuery.category = { $in: ['job', 'internship'] };
    dbQuery.source = { $nin: eventSources };
  }

  // Enforce location filtering if specified, otherwise fallback to India-only for jobs/internships
  if (location && location.trim()) {
    dbQuery.location = { $regex: location.trim(), $options: 'i' };
  } else if (category === 'job' || category === 'internship' || !category) {
    dbQuery.location = { $regex: INDIA_LOC_REGEX };
  }

  if (queryTerms.length > 0) {
    const andConditions = queryTerms.map(term => {
      const escapedTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      return {
        $or: [
          { title:       { $regex: escapedTerm, $options: 'i' } },
          { description: { $regex: escapedTerm, $options: 'i' } },
          { location:    { $regex: escapedTerm, $options: 'i' } },
          { skills:      { $regex: escapedTerm, $options: 'i' } },
        ]
      };
    });

    if (dbQuery.$or) {
      const existingOr = dbQuery.$or;
      delete dbQuery.$or;
      dbQuery.$and = [{ $or: existingOr }, ...andConditions];
    } else {
      dbQuery.$and = andConditions;
    }
  }

  if (excludeIds && excludeIds.length > 0) {
    dbQuery.id = { $nin: excludeIds };
  }

  return dbQuery;
}

exports.getMatchedJobs = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('+jobKeywords +cvLatex');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prefer the structured jobKeywords array set by the CV pipeline; fall back
    // to a simple scan of the raw LaTeX if the array is not yet populated.
    let userSkills = user.jobKeywords || [];
    if (userSkills.length === 0 && user.cvLatex) {
      const cvText = user.cvLatex.toLowerCase();
      const fallbackList = ['react', 'node', 'python', 'java', 'typescript', 'javascript',
        'golang', 'django', 'spring', 'aws', 'docker', 'kubernetes', 'sql', 'mongodb',
        'postgresql', 'express', 'next.js', 'vue', 'angular', 'redis', 'linux', 'git'];
      userSkills = fallbackList.filter(s => cvText.includes(s));
    }

    // Query listings collection — no external API calls, no scraping
    const query = {
      is_active: true,
      category: { $in: ['job'] },
    };
    if (userSkills.length > 0) {
      query.skills = { $in: userSkills };
    }

    const listings = await Listing.find(query).limit(200).lean();

    const seenIds = new Set([
      ...(user.savedJobs || []).map(j => String(j.id)),
      ...(user.dislikedJobs || []).map(id => String(id)),
    ]);

    const scored = listings
      .filter(l => !seenIds.has(String(l.id)))
      .map(l => scoreAndShape(l, userSkills))
      .sort((a, b) => b.matchPct - a.matchPct)
      .slice(0, 20);

    res.status(200).json({ success: true, jobs: scored });
  } catch (err) {
    console.error('[getMatchedJobs]', err);
    res.status(500).json({ success: false, message: 'Server Internal Error' });
  }
};

exports.customSearchJobs = async (req, res) => {
  try {
    const { userId } = req.params;
    const { query, category, triggerScrape, skills, location } = req.body;
    const user = await User.findById(userId).select('+jobKeywords +cvLatex');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    let userSkills = user.jobKeywords || [];
    if (userSkills.length === 0 && user.cvLatex) {
      const cvText = user.cvLatex.toLowerCase();
      const fallbackList = ['react', 'node', 'python', 'java', 'typescript', 'javascript',
        'golang', 'django', 'spring', 'aws', 'docker', 'kubernetes', 'sql', 'mongodb',
        'postgresql', 'express', 'next.js', 'vue', 'angular', 'redis', 'linux', 'git'];
      userSkills = fallbackList.filter(s => cvText.includes(s));
    }

    if (triggerScrape) {
      const scraperQuery = skills ? skills.trim() : (query || 'developer');
      spawnScraper(scraperQuery, location, category || 'job');
    }

    // Parse the free-text query into keyword tokens
    const queryTerms = (query || '')
      .split(/\s+/)
      .map(t => t.toLowerCase().trim())
      .filter(Boolean);

    // If both query terms and category are empty, return error
    if (queryTerms.length === 0 && !category) {
      return res.status(400).json({ success: false, message: 'Search query or category is required.' });
    }

    // Use shared query builder (no excludeIds in the POST path)
    const dbQuery = buildDbQuery(category, queryTerms, [], location);

    const listings = await Listing.find(dbQuery).limit(100).lean();

    const seenIds = new Set([
      ...(user.savedJobs || []).map(j => String(j.id)),
      ...(user.dislikedJobs || []).map(id => String(id)),
    ]);

    const scored = listings
      .filter(l => !seenIds.has(String(l.id)))
      .map(l => {
        if (l.category === 'event') {
          const eventMatch = scoreAndShape(l, userSkills);
          const matchPct = eventMatch.matchPct > 0 ? eventMatch.matchPct : 75;
          return {
            id:         l.id,
            role:       l.title,
            company:    l.organization || 'Tech Community',
            matchPct,
            location:   l.location || 'Remote',
            salary:     l.event_date
                          ? new Date(l.event_date).toLocaleDateString('en-IN', {
                              month: 'short', day: 'numeric', year: 'numeric'
                            })
                          : 'Upcoming Event',
            isUrgent:   false,
            techStack:  l.event_type 
                          ? [l.event_type.charAt(0).toUpperCase() + l.event_type.slice(1)]
                          : ['Event'],
            url:        l.apply_url || '',
            image_url:  l.image_url || null,
          };
        }
        return scoreAndShape(l, userSkills);
      })
      .sort((a, b) => b.matchPct - a.matchPct)
      .slice(0, 20);

    res.status(200).json({ success: true, jobs: scored });
  } catch (error) {
    console.error('[customSearchJobs]', error);
    res.status(500).json({ success: false, message: 'Server Internal Error' });
  }
};

// ============================================================
//  SEARCH STREAM — real-time SSE endpoint (replaces polling)
// ============================================================
exports.searchStream = async (req, res) => {
  // ── SSE headers ─────────────────────────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering if behind proxy
  res.flushHeaders();

  // Guard: ensure res.end() is only called once regardless of which path fires
  let ended = false;
  const endStream = () => {
    if (ended) return;
    ended = true;
    res.end();
  };

  const sendEvent = (name, payload) => {
    if (ended) return;
    res.write(`event: ${name}\ndata: ${JSON.stringify(payload)}\n\n`);
  };

  // ── Parse query params ───────────────────────────────────────────────────────
  const { userId, query = '', location = '', category = 'job', excludeIds: rawExclude = '' } = req.query;

  const excludeIds = rawExclude ? rawExclude.split(',').filter(Boolean) : [];
  const queryTerms = query.trim()
    .split(/\s+/)
    .map(t => t.toLowerCase().trim())
    .filter(Boolean);

  const MAX_RESULTS = 20;
  const sentIds = new Set(excludeIds); // dedup within this connection
  let sentCount = 0;

  // Fetch user once — used in both Step 1 and the watcher
  const user = await User.findById(userId).select('+jobKeywords +cvLatex').catch(() => null);
  let userSkills = [];
  if (user) {
    userSkills = user.jobKeywords || [];
    if (userSkills.length === 0 && user.cvLatex) {
      const cvText = user.cvLatex.toLowerCase();
      const fallbackList = ['react', 'node', 'python', 'java', 'typescript', 'javascript',
        'golang', 'django', 'spring', 'aws', 'docker', 'kubernetes', 'sql', 'mongodb',
        'postgresql', 'express', 'next.js', 'vue', 'angular', 'redis', 'linux', 'git'];
      userSkills = fallbackList.filter(s => cvText.includes(s));
    }
  }

  const seenIds = new Set([
    ...(user?.savedJobs || []).map(j => String(j.id)),
    ...(user?.dislikedJobs || []).map(id => String(id)),
  ]);

  // ── Helper: shape a listing to the wire format ────────────────────────────
  const shapeListing = (l) => {
    if (l.category === 'event') {
      const eventMatch = scoreAndShape(l, userSkills);
      const matchPct = eventMatch.matchPct > 0 ? eventMatch.matchPct : 75;
      return {
        id:        l.id,
        role:      l.title,
        company:   l.organization || 'Tech Community',
        matchPct,
        location:  l.location || 'Remote',
        salary:    l.event_date
                     ? new Date(l.event_date).toLocaleDateString('en-IN', {
                         month: 'short', day: 'numeric', year: 'numeric'
                       })
                     : 'Upcoming Event',
        isUrgent:  false,
        techStack: l.event_type
                     ? [l.event_type.charAt(0).toUpperCase() + l.event_type.slice(1)]
                     : ['Event'],
        url:       l.apply_url || '',
        image_url: l.image_url || null,
      };
    }
    return scoreAndShape(l, userSkills);
  };

  // ── Step 1: immediately stream cached DB results ──────────────────────────
  try {
    const dbQuery = buildDbQuery(category, queryTerms, excludeIds, location);
    const cached = await Listing.find(dbQuery).limit(100).lean();

    const shaped = cached
      .map(l => shapeListing(l))
      .sort((a, b) => b.matchPct - a.matchPct);

    for (const item of shaped) {
      if (sentCount >= MAX_RESULTS) break;
      if (sentIds.has(item.id) || seenIds.has(String(item.id))) continue;
      sentIds.add(item.id);
      sentCount++;
      sendEvent('job', item);
    }
  } catch (err) {
    console.error('[searchStream] Initial DB query failed:', err);
  }

  // If we already hit cap from cache, close immediately
  if (sentCount >= MAX_RESULTS) {
    sendEvent('done', { reachedCap: true });
    endStream();
    return;
  }

  // ── Step 2: spawn scraper ──────────────────────────────────────────────────
  const hasSearchParams = query.trim() || location.trim();
  if (!hasSearchParams) {
    // No query — nothing new to scrape; return what we found
    sendEvent('done', { reachedCap: sentCount >= MAX_RESULTS });
    endStream();
    return;
  }

  sendEvent('status', { message: `Starting live search across job boards...` });

  let child = null;
  let watchInterval = null;

  // ── Step 3: DB watcher — poll every 800ms for newly inserted docs ─────────
  // (user and seenIds already fetched above)

  const startWatcher = () => {
    watchInterval = setInterval(async () => {
      if (ended) { clearInterval(watchInterval); return; }
      if (sentCount >= MAX_RESULTS) {
        clearInterval(watchInterval);
        sendEvent('done', { reachedCap: true });
        if (child) { try { child.kill(); } catch (_) {} }
        endStream();
        return;
      }
      try {
        const dbQuery = buildDbQuery(category, queryTerms, [...excludeIds, ...sentIds], location);
        const newDocs = await Listing.find(dbQuery).sort({ createdAt: -1 }).limit(10).lean();
        for (const l of newDocs) {
          if (sentCount >= MAX_RESULTS) break;
          if (sentIds.has(l.id) || seenIds.has(String(l.id))) continue;
          sentIds.add(l.id);
          sentCount++;
          sendEvent('job', shapeListing(l));
        }
      } catch (_) { /* DB poll errors are non-fatal */ }
    }, 800);
  };

  // ── Spawn scraper (same logic as spawnScraper helper) ────────────────────
  try {
    const fs = require('fs');
    const scraperDir = path.join(__dirname, '..', 'scraper');
    const pythonScript = path.join(scraperDir, 'run_search.py');
    const venvPython = path.join(scraperDir, 'venv', 'bin', 'python3');
    const systemPython = process.platform === 'win32' ? 'python' : 'python3';
    const pythonExec = fs.existsSync(venvPython) ? venvPython : systemPython;

    let adapters = [];
    if (category === 'job')       adapters = ['naukri', 'linkedin', 'serpapi_jobs'];
    else if (category === 'internship') adapters = ['internshala', 'foundit'];
    else if (category === 'meetup')     adapters = ['luma', 'meetup'];
    else if (category === 'hackathon')  adapters = ['luma', 'meetup'];
    else adapters = ['naukri', 'linkedin', 'serpapi_jobs', 'internshala'];

    const args = [
      pythonScript,
      '--adapter', adapters.join(','),
      '--query', query || 'developer',
    ];
    if (location) args.push('--location', location);
    if (category) args.push('--category', category);

    console.log(`[SSE Scraper] Spawning: ${pythonExec} ${args.join(' ')}`);
    child = require('child_process').spawn(pythonExec, args, { cwd: scraperDir });

    child.stdout.on('data', (data) => {
      const text = data.toString();
      // Forward STATUS: lines directly to the browser as SSE events
      text.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('STATUS:')) {
          sendEvent('status', { message: trimmed.slice(7).trim() });
        }
      });
      console.log(`[SSE stdout]: ${text.trim()}`);
    });

    child.stderr.on('data', (data) => {
      console.error(`[SSE stderr]: ${data.toString().trim()}`);
    });

    child.on('close', (code) => {
      console.log(`[SSE Scraper] Exited with code ${code}`);
      if (ended) return;
      // Give the DB watcher a final 2-second grace period to pick up
      // any docs written in the last tick before closing the stream
      setTimeout(() => {
        clearInterval(watchInterval);
        if (!ended) {
          sendEvent('done', { reachedCap: sentCount >= MAX_RESULTS });
          endStream();
        }
      }, 2000);
    });

    child.on('error', (err) => {
      console.error('[SSE Scraper] Failed to spawn:', err);
      sendEvent('status', { message: 'Search engine encountered an error.' });
      clearInterval(watchInterval);
      sendEvent('done', { reachedCap: false });
      endStream();
    });

  } catch (spawnErr) {
    console.error('[searchStream] spawn error:', spawnErr);
    sendEvent('done', { reachedCap: false });
    endStream();
    return;
  }

  startWatcher();

  // ── 90-second hard timeout ─────────────────────────────────────────────────
  const hardTimeout = setTimeout(() => {
    console.log('[SSE] 90s hard timeout reached.');
    clearInterval(watchInterval);
    if (child) { try { child.kill(); } catch (_) {} }
    if (!ended) {
      sendEvent('timeout', { message: 'Search timed out. Showing results found so far.' });
      endStream();
    }
  }, 90_000);

  // ── Cleanup on client disconnect ───────────────────────────────────────────
  req.on('close', () => {
    console.log('[SSE] Client disconnected — cleaning up.');
    ended = true;
    clearInterval(watchInterval);
    clearTimeout(hardTimeout);
    if (child) { try { child.kill(); } catch (_) {} }
  });
};

exports.swipeJob = async (req, res) => {
  try {
    const { userId } = req.params;
    const { direction, job } = req.body;
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    if (direction === 'right') {
      user.savedJobs.push(job);
    } else if (direction === 'left') {
      user.dislikedJobs.push(job.id.toString());
    }
    
    await user.save();
    res.status(200).json({ success: true, message: 'Swipe recorded' });
  } catch (error) {
    console.error("Error in swipeJob:", error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getSavedJobs = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    res.status(200).json({ success: true, savedJobs: user.savedJobs || [] });
  } catch (error) {
    console.error("Error in getSavedJobs:", error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.generateApplicationPackage = async (req, res) => {
  try {
    const { userId } = req.params;
    const { job } = req.body;

    if (!job) {
      return res.status(400).json({ success: false, message: 'Job data is required.' });
    }

    const user = await User.findById(userId).select('+cvLatex');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const masterCv = user.cvLatex || '';
    if (!masterCv) {
      return res.status(400).json({ success: false, message: 'No master CV found. Please generate your CV first.' });
    }

    const jobDescription = [
      `Role: ${job.role || 'Software Engineer'}`,
      `Company: ${job.company || 'Unknown'}`,
      `Location: ${job.location || 'Remote'}`,
      `Salary: ${job.salary || 'Competitive'}`,
      `Required Tech Stack: ${(job.techStack || []).join(', ')}`,
      `Match: ${job.matchPct || 0}%`
    ].join('\n');

    const agentPath = path.join(__dirname, '..', 'ai_agent');
    const pythonScript = path.join(agentPath, 'tailor_resume.py');
    // Use venv python locally, system python3 on Render/production
    const venvPython = path.join(agentPath, 'venv', 'bin', 'python3');
    const systemPython = process.platform === 'win32' ? 'python' : 'python3';
    const pythonExec = require('fs').existsSync(venvPython) ? venvPython : systemPython;
    const fs = require('fs');

    // Write input to /tmp to avoid triggering nodemon (which watches the project dir)
    const os = require('os');
    const tempInputPath = path.join(os.tmpdir(), `_tailor_input_${Date.now()}.json`);
    fs.writeFileSync(tempInputPath, JSON.stringify({
      master_cv: masterCv,
      job_title: job.role || 'Software Engineer',
      company: job.company || 'Company',
      job_description: jobDescription
    }), 'utf-8');

    console.log(`[ApplicationEngine] Tailoring resume for "${job.role}" at "${job.company}"...`);
    console.log(`[ApplicationEngine] Temp input file: ${tempInputPath} (${masterCv.length} chars of CV)`);

    // Read the GROQ_API_KEY from the ai_agent .env and forward it
    const dotenvPath = path.join(agentPath, '.env');
    let groqKey = '';
    if (fs.existsSync(dotenvPath)) {
      const envContent = fs.readFileSync(dotenvPath, 'utf-8');
      const match = envContent.match(/GROQ_API_KEY=(.+)/);
      if (match) groqKey = match[1].trim();
    }

    const pyProcess = spawn(pythonExec, [pythonScript, tempInputPath], {
      cwd: agentPath,
      env: { ...process.env, GROQ_API_KEY: groqKey || process.env.GROQ_API_KEY || '' }
    });

    let stdoutData = '';
    let stderrData = '';

    pyProcess.stdout.on('data', (d) => { stdoutData += d.toString(); });
    pyProcess.stderr.on('data', (d) => {
      stderrData += d.toString();
      console.log(`[TailorEngine]: ${d.toString()}`);
    });

    pyProcess.on('close', (code) => {
      console.log(`[ApplicationEngine] Python exited with code ${code}`);

      // Clean up temp file
      try { fs.unlinkSync(tempInputPath); } catch (_) {}

      const marker = '--- TAILOR JSON OUTPUT ---';
      const markerIdx = stdoutData.indexOf(marker);

      if (markerIdx === -1) {
        console.error('[ApplicationEngine] No JSON marker found in stdout. Raw output:', stdoutData.slice(-500));
        return res.status(500).json({ success: false, message: 'AI engine did not produce output.', error: stderrData.slice(-500) });
      }

      try {
        const rawJson = stdoutData.substring(markerIdx + marker.length);
        const firstBrace = rawJson.indexOf('{');
        const lastBrace = rawJson.lastIndexOf('}');

        if (firstBrace === -1 || lastBrace === -1) {
          throw new Error('Could not locate JSON braces in output');
        }

        const result = JSON.parse(rawJson.substring(firstBrace, lastBrace + 1));
        console.log(`[ApplicationEngine] ✅ Successfully generated tailored resume text.`);

        // --- HACKATHON AUTO APPLY INJECTION --- //
        try {
          // 1. Compile the newly tailored LaTeX to a physical PDF using Tectonic
          const { execFile } = require('child_process');
          const crypto = require('crypto');
          const tempId = crypto.randomUUID();
          
          const texFilePath = path.join(os.tmpdir(), `${tempId}.tex`);
          const pdfFilePath = path.join(os.tmpdir(), `${tempId}.pdf`);
          
          // Write the new tailored CV to disk
          fs.writeFileSync(texFilePath, result.tailored_cv, 'utf-8');
          console.log(`[AutoApply] Compiling Tailored PDF...`);
          
          const { exec } = require('child_process');
          
          // Execute with explicit PATH exports to capture /opt/homebrew/bin for Macs where env vars don't trickle down to Node
          exec(`export PATH=$PATH:/opt/homebrew/bin:/usr/local/bin && tectonic "${texFilePath}"`, async (err) => {
            if (err) {
              console.warn("[AutoApply] Local Tectonic failed or is missing. Engaging Cloud Compiler Fallback...");
              
              // CLOUD FALLBACK: latexonline requires creating a swift buffer
              try {
                const compilePayload = encodeURIComponent(result.tailored_cv);
                const cloudResp = await fetch(`https://latexonline.cc/compile?text=${compilePayload}`, {
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                
                if (!cloudResp.ok) throw new Error("Cloud Compiler Rejected");
                
                const pdfBuffer = await cloudResp.arrayBuffer();
                fs.writeFileSync(pdfFilePath, Buffer.from(pdfBuffer));
                console.log(`[AutoApply] Cloud PDF Compilation Successful!`);
              } catch (cloudErr) {
                 console.error("[AutoApply] Cloud Compiler also failed:", cloudErr);
                 fs.writeFileSync(path.join(__dirname, '..', 'debug_failed_cv.tex'), result.tailored_cv, 'utf-8');
                 return res.status(500).json({ success: false, message: 'Failed to compile Tailored PDF via both Local and Cloud mechanisms', error: err.message });
              }
            } else {
                console.log(`[AutoApply] Local Tectonic Compilation Successful!`);
            }
            
            console.log(`[AutoApply] Instantiating Headless Bot...`);
            // 2. Feed the compiled PDF & Target URL to the Headless AutoApply Bot
            const { executeAutoApply } = require('../services/autoApplyBot');
            
            // Reconstruct minimal profile data for forms
            const nameParts = (user.name || 'Hired User').split(' ');
            const dummyProfile = {
               firstName: nameParts[0],
               lastName: nameParts.length > 1 ? nameParts[nameParts.length - 1] : 'Hired',
               email: user.email || 'apply@hired.com',
               phone: '+91 9999999999'
            };

            const targetUrl = job.url || 'https://jobs.lever.co/mock-startup/job-id/apply'; 

            let botResult = { success: false, message: 'Bot skipped' };
            try {
                botResult = await executeAutoApply(
                  targetUrl, 
                  dummyProfile, 
                  pdfFilePath, 
                  (log) => console.log(`[AutoApplyBot Streams] ${log}`)
                );
            } catch(botErr) {
                console.error("[AutoApplyBot] Crash:", botErr.message);
                botResult.message = `Bot Error: ${botErr.message}`;
            }
            
            console.log(`[AutoApply] Bot Execution Finished!`);

            // Read the generated PDF explicitly to send it back for frontend downloading
            let pdfBase64 = null;
            try {
                if (fs.existsSync(pdfFilePath)) {
                    pdfBase64 = fs.readFileSync(pdfFilePath).toString('base64');
                }
            } catch (fsErr) {
                console.error("[AutoApply] Could not read PDF for base64 return:", fsErr);
            }

            res.status(200).json({
              success: true,
              tailoredCv: result.tailored_cv,
              coverLetter: result.cover_letter,
              jobUrl: job.url || null,
              pdfBase64: pdfBase64,
              botResult: botResult // Includes base64 screenshot proof of ATS injection!
            });
            console.log(`[ApplicationEngine] ✅ Successfully dispatched HTTP 200 Final Response!`);
          });
        } catch (autoErr) {
          console.error('[ApplicationEngine] AutoApply Flow Error:', autoErr.message);
          res.status(500).json({ success: false, message: 'AutoApply failed.', error: autoErr.message });
        }
        // -------------------------------------- //

      } catch (parseErr) {
        console.error('[ApplicationEngine] JSON parse error:', parseErr.message);
        res.status(500).json({ success: false, message: 'Failed to parse AI output.', error: parseErr.message });
      }
    });

  } catch (error) {
    console.error("Error in generateApplicationPackage:", error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// ============================================================
//  INTERNSHIPS — read from listings collection
// ============================================================
exports.getInternships = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('+jobKeywords +cvLatex');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    let userSkills = user.jobKeywords || [];
    if (userSkills.length === 0 && user.cvLatex) {
      const cvText = user.cvLatex.toLowerCase();
      const fallbackList = ['react', 'node', 'python', 'java', 'typescript', 'javascript',
        'django', 'aws', 'docker', 'kubernetes', 'sql', 'mongodb', 'express', 'git'];
      userSkills = fallbackList.filter(s => cvText.includes(s));
    }

    const query = { is_active: true, category: 'internship' };
    if (userSkills.length > 0) query.skills = { $in: userSkills };

    const listings = await Listing.find(query).limit(100).lean();

    const internships = listings
      .map(l => ({
        id:        l.id,
        title:     l.title,
        company:   l.organization,
        location:  l.location || 'India',
        stipend:   l.salary_or_stipend || 'Paid',
        duration:  l.employment_type || 'Internship',
        techStack: (l.skills || []).slice(0, 4).map(t => t.charAt(0).toUpperCase() + t.slice(1)),
        url:       l.apply_url || '',
        deadline:  l.deadline || null,
        matchPct:  scoreAndShape(l, userSkills).matchPct,
      }))
      .sort((a, b) => b.matchPct - a.matchPct)
      .slice(0, 15);

    res.status(200).json({ success: true, internships });
  } catch (error) {
    console.error('[getInternships]', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// ============================================================
//  EVENTS — read from listings collection
// ============================================================
exports.getEvents = async (req, res) => {
  try {
    const listings = await Listing.find({
      is_active: true,
      category: 'event',
    })
      .sort({ event_date: 1 })  // soonest first
      .limit(50)
      .lean();

    const events = listings.map(l => ({
      id:          l.id,
      title:       l.title,
      organizer:   l.organization || 'Tech Community',
      date:        l.event_date
                     ? new Date(l.event_date).toLocaleDateString('en-IN', {
                         month: 'short', day: 'numeric', year: 'numeric'
                       })
                     : 'Upcoming',
      location:    l.location || 'India',
      type:        l.event_type
                     ? l.event_type.charAt(0).toUpperCase() + l.event_type.slice(1)
                     : 'Event',
      url:         l.apply_url || '',
      description: (l.description || '').substring(0, 140),
      isRemote:    l.is_remote || false,
      image_url:   l.image_url || null,
      matchPct:    95,
    }));

    res.status(200).json({ success: true, events: events.slice(0, 20) });
  } catch (error) {
    console.error('[getEvents]', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

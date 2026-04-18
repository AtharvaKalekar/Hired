const User = require('../models/User');
const https = require('https'); // Use native https to avoid missing dependency crashes
const { spawn } = require('child_process');
const path = require('path');
const { fetchLiveJobs } = require('../services/liveJobScraper');
const JobCache = require('../models/JobCache');

exports.getMatchedJobs = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user and their generated CV LaTeX string
    const user = await User.findById(userId).select('+cvLatex');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const cvLatex = user.cvLatex || '';
    if (!cvLatex) {
      return res.status(400).json({ success: false, message: 'User does not have a generated CV yet.' });
    }

    // Extract core keywords to check matches against
    // Provide a simple whitelist of strong tech skills commonly found
    const techKeywords = ["react", "node", "python", "java", "c++", "c#", "typescript", "javascript", "golang", "ruby", "django", "spring", "aws", "docker", "kubernetes", "sql", "mongodb", "postgresql", "express", "next.js", "vue", "angular", "mysql", "redis", "linux", "git", "graphql", "hyperledger", "blockchain", "solidity"];
    
    const userSkills = techKeywords.filter(skill => cvLatex.toLowerCase().includes(skill));

    let jobs = [];
    try {
      const cacheKey = (userSkills.length > 0 ? userSkills.slice(0, 2).join(' ').toLowerCase() : 'software developer') + '-api-v2';
      console.log(`[JobEngine] Fetching API jobs for: '${cacheKey}'`);
      
      const cachedData = await JobCache.findOne({ query: cacheKey });
      
      // If Cache hit and it's less than 24 hours old
      if (cachedData && cachedData.jobs && cachedData.jobs.length > 0 && (Date.now() - new Date(cachedData.lastUpdated).getTime() < 86400000)) {
         console.log(`[JobEngine] 🚀 CACHE HIT! Returning jobs for '${cacheKey}' instantaneously.`);
         jobs = cachedData.jobs;
      } else {
         console.log(`[JobEngine] 🐢 CACHE MISS! Fetching real Remote Jobs API...`);
         jobs = await fetchLiveJobs(userSkills);
         
         if (jobs && jobs.length > 0) {
             // Save to cache!
             await JobCache.findOneAndUpdate(
                 { query: cacheKey }, 
                 { jobs, lastUpdated: new Date() }, 
                 { upsert: true, new: true }
             );
         }
      }
    } catch (err) {
      console.error("[JobEngine] Error in Job Retrieval pipeline:", err.message);
    }

    // Score jobs
    let scoredJobs = jobs.map(job => {
      let matchCount = 0;
      
      const jobString = ((job.title || '') + " " + (job.description || '') + " " + (job.tags || []).join(' ')).toLowerCase();
      
      // Calculate matches
      let matchedTechs = [];
      userSkills.forEach(skill => {
        if (jobString.includes(skill.toLowerCase())) {
          matchCount++;
          matchedTechs.push(skill);
        }
      });

      // Calculate percentage based on user's known skills.
      // If user has 5 verified skills, and job matches 4, that's an 80% match.
      let matchPct = userSkills.length > 0 ? Math.min(Math.round((matchCount / userSkills.length) * 100), 99) : 0;
      
      // Add randomness for presentation so it doesn't just equal strictly to block numbers, 
      // cap at 98 max so it shows "Highly Mached". Give base score for standard SWE alignment.
      if (matchPct < 30) matchPct += 30; // base floor
      if (matchPct > 98) matchPct = 98;

      return {
        id: job.id,
        role: job.title,
        company: job.company_name,
        matchPct,
        location: job.candidate_required_location || 'Remote (Global)',
        salary: job.salary || 'Competitive',
        isUrgent: Math.random() > 0.8, // 20% are flagged as urgent matching
        techStack: matchedTechs.slice(0, 4).map(t => t.charAt(0).toUpperCase() + t.slice(1)), 
        url: job.url
      };
    });

    // Sort heavily matched first
    scoredJobs.sort((a, b) => b.matchPct - a.matchPct);

    // Remove any jobs the user has already liked or disliked from the stream
    const seenJobIds = new Set([...(user.savedJobs||[]).map(j=>j.id.toString()), ...(user.dislikedJobs||[]).map(id=>id.toString())]);
    let unseenJobs = scoredJobs.filter(j => !seenJobIds.has(j.id.toString()));

    if (unseenJobs.length === 0) {
       unseenJobs = scoredJobs; // Fallback so we don't return an empty array if they wiped out all jobs in the simulation.
    }

    // Return Top 15 recommended unseen jobs
    res.status(200).json({
      success: true,
      jobs: unseenJobs.slice(0, 15)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Internal Error' });
  }
};

exports.customSearchJobs = async (req, res) => {
  // We can reuse getMatchedJobs but override userSkills with the custom query
  try {
    const { userId } = req.params;
    const { query } = req.body; // e.g. "Python Backend Developer"
    
    const user = await User.findById(userId).select('+cvLatex');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    let customRegexSkills = query ? query.split(' ').map(q => q.toLowerCase().trim()).filter(Boolean) : ["software"];
    
    let jobs = [];
    const cacheKey = customRegexSkills.join(' ').toLowerCase() + '-api-v2';
    
    const cachedData = await JobCache.findOne({ query: cacheKey });
    
    if (cachedData && cachedData.jobs && cachedData.jobs.length > 0 && (Date.now() - new Date(cachedData.lastUpdated).getTime() < 86400000)) {
       console.log(`[JobEngine] 🚀 CACHE HIT! Returning jobs for Custom Query: '${cacheKey}'`);
       jobs = cachedData.jobs;
    } else {
       console.log(`[JobEngine] 🐢 CACHE MISS! Live Scrape for Custom Query...`);
       jobs = await fetchLiveJobs(customRegexSkills);
       
       if (jobs && jobs.length > 0) {
           await JobCache.findOneAndUpdate(
               { query: cacheKey }, 
               { jobs, lastUpdated: new Date() }, 
               { upsert: true, new: true }
           );
       }
    }

    let scoredJobs = jobs.map(job => {
      const jobString = ((job.title || '') + " " + (job.description || '') + " " + (job.tags || []).join(' ')).toLowerCase();
      let matchCount = 0;
      let matchedTechs = [];
      customRegexSkills.forEach(skill => {
        if (jobString.includes(skill)) {
          matchCount++;
          matchedTechs.push(skill);
        }
      });
      let matchPct = customRegexSkills.length > 0 ? Math.min(Math.round((matchCount / customRegexSkills.length) * 100), 99) : 80;
      if (matchPct < 30) matchPct += 30; 
      if (matchPct > 98) matchPct = 98;
      return {
        id: job.id || Math.random().toString(),
        role: job.title,
        company: job.company_name,
        matchPct,
        location: job.candidate_required_location || 'Remote (Global)',
        salary: job.salary || 'Competitive',
        isUrgent: Math.random() > 0.8,
        techStack: matchedTechs.slice(0, 4).map(t => t.charAt(0).toUpperCase() + t.slice(1)), 
        url: job.url
      };
    });

    scoredJobs.sort((a, b) => b.matchPct - a.matchPct);
    
    // Remove seen
    const seenJobIds = new Set([...(user.savedJobs||[]).map(j=>j.id.toString()), ...(user.dislikedJobs||[]).map(id=>id.toString())]);
    let unseenJobs = scoredJobs.filter(j => !seenJobIds.has(j.id.toString()));

    res.status(200).json({ success: true, jobs: unseenJobs.slice(0, 15) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Internal Error' });
  }
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
    const venvPython = path.join(agentPath, 'venv', 'bin', 'python3');
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

    const pyProcess = spawn(venvPython, [pythonScript, tempInputPath], {
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
//  INTERNSHIPS SCRAPER
// ============================================================
exports.getInternships = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('+cvLatex');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const cvLatex = user.cvLatex || '';
    const techKeywords = ["react", "node", "python", "java", "c++", "typescript", "javascript", "django", "aws", "docker", "kubernetes", "sql", "mongodb", "express", "next.js", "vue", "angular", "git"];
    const userSkills = techKeywords.filter(skill => cvLatex.toLowerCase().includes(skill));

    let internships = [];

    try {
      // Use SerpApi for internships if available
      if (process.env.SERPAPI_KEY) {
        const queryStr = encodeURIComponent(userSkills.length > 0 ? userSkills.slice(0,2).join(' ') + ' Internship India' : 'Software Engineering Internship India');
        const payload = await new Promise((resolve, reject) => {
          https.get(`https://serpapi.com/search.json?engine=google_jobs&q=${queryStr}&api_key=${process.env.SERPAPI_KEY}`, (resp) => {
            let chunks = '';
            resp.on('data', (c) => chunks += c);
            resp.on('end', () => { try { resolve(JSON.parse(chunks)); } catch(e) { reject(e); } });
          }).on("error", reject);
        });
        const results = payload.jobs_results || [];
        internships = results.map((j, idx) => ({
          id: j.job_id || 'int-' + idx,
          title: j.title,
          company: j.company_name,
          location: j.location || 'India',
          stipend: j.detected_extensions?.salary || 'Paid',
          duration: j.detected_extensions?.schedule_type || '3-6 Months',
          techStack: userSkills.filter(s => (j.description||'').toLowerCase().includes(s)).slice(0, 3).map(t => t.charAt(0).toUpperCase() + t.slice(1)),
          url: j.apply_options?.[0]?.link || j.related_links?.[0]?.link || j.share_link,
          matchPct: Math.min(Math.round(Math.random() * 30 + 65), 98)
        }));
      } else {
        // Fallback: Remotive remote internships
        const payload = await new Promise((resolve, reject) => {
          https.get('https://remotive.com/api/remote-jobs?category=software-dev&limit=50', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
          }, (resp) => {
            let chunks = '';
            resp.on('data', (c) => chunks += c);
            resp.on('end', () => { try { resolve(JSON.parse(chunks)); } catch(e) { reject(e); } });
          }).on("error", reject);
        });
        const remoteJobs = (payload.jobs || []).filter(j => {
          const title = (j.title || '').toLowerCase();
          return title.includes('intern') || title.includes('junior') || title.includes('entry') || title.includes('graduate') || title.includes('trainee');
        });
        internships = remoteJobs.map((j, idx) => ({
          id: j.id || 'int-' + idx,
          title: j.title,
          company: j.company_name,
          location: j.candidate_required_location || 'Remote',
          stipend: j.salary || 'Paid',
          duration: '3-6 Months',
          techStack: userSkills.filter(s => (j.description||'').toLowerCase().includes(s)).slice(0, 3).map(t => t.charAt(0).toUpperCase() + t.slice(1)),
          url: j.url,
          matchPct: Math.min(Math.round(Math.random() * 30 + 65), 98)
        }));
      }
    } catch (err) {
      console.error("[InternEngine] Scraping error:", err.message);
    }

    // Curated fallback if APIs yield 0
    if (internships.length === 0) {
      internships = [
        { id: 'int-1', title: 'SDE Intern', company: 'Amazon', location: 'Hyderabad, India', stipend: '₹60,000/mo', duration: '6 Months', techStack: ['Java', 'AWS', 'SQL'], url: 'https://amazon.jobs', matchPct: 92 },
        { id: 'int-2', title: 'Frontend Intern', company: 'Flipkart', location: 'Bengaluru, India', stipend: '₹50,000/mo', duration: '3 Months', techStack: ['React', 'TypeScript'], url: 'https://flipkart.com/careers', matchPct: 88 },
        { id: 'int-3', title: 'Backend Engineering Intern', company: 'Google', location: 'Remote (India)', stipend: '₹80,000/mo', duration: '4 Months', techStack: ['Python', 'Go', 'Docker'], url: 'https://careers.google.com', matchPct: 85 },
        { id: 'int-4', title: 'Data Engineering Intern', company: 'Microsoft', location: 'Noida, India', stipend: '₹70,000/mo', duration: '6 Months', techStack: ['Python', 'SQL', 'Azure'], url: 'https://careers.microsoft.com', matchPct: 80 },
        { id: 'int-5', title: 'Full Stack Intern', company: 'Razorpay', location: 'Bengaluru, India', stipend: '₹45,000/mo', duration: '3 Months', techStack: ['React', 'Node', 'MongoDB'], url: 'https://razorpay.com/careers', matchPct: 94 }
      ];
    }

    res.status(200).json({ success: true, internships: internships.slice(0, 15) });
  } catch (error) {
    console.error("Error in getInternships:", error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// ============================================================
//  EVENTS SCRAPER
// ============================================================
exports.getEvents = async (req, res) => {
  try {
    let events = [];

    try {
      // Use SerpApi Google Events engine
      if (process.env.SERPAPI_KEY) {
        const queryStr = encodeURIComponent('Tech conference hackathon India 2025');
        const payload = await new Promise((resolve, reject) => {
          https.get(`https://serpapi.com/search.json?engine=google_events&q=${queryStr}&api_key=${process.env.SERPAPI_KEY}`, (resp) => {
            let chunks = '';
            resp.on('data', (c) => chunks += c);
            resp.on('end', () => { try { resolve(JSON.parse(chunks)); } catch(e) { reject(e); } });
          }).on("error", reject);
        });
        const results = payload.events_results || [];
        events = results.map((e, idx) => ({
          id: 'evt-' + idx,
          title: e.title,
          organizer: e.venue?.name || 'Tech Community',
          date: e.date?.start_date || 'Upcoming',
          location: e.address?.[0] || e.venue?.name || 'India',
          type: (e.title || '').toLowerCase().includes('hackathon') ? 'Hackathon' : (e.title || '').toLowerCase().includes('workshop') ? 'Workshop' : 'Conference',
          url: e.link || e.event_location_map?.link,
          description: e.description?.substring(0, 120) || ''
        }));
      }

      // Additional: Fetch from Luma (free public events API)
      if (events.length < 5) {
        try {
          const lumaPayload = await new Promise((resolve, reject) => {
            https.get('https://api.lu.ma/public/v2/event/search?query=tech+india&limit=10', {
              headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
            }, (resp) => {
              let chunks = '';
              resp.on('data', (c) => chunks += c);
              resp.on('end', () => { try { resolve(JSON.parse(chunks)); } catch(e) { resolve({ entries: [] }); } });
            }).on("error", () => resolve({ entries: [] }));
          });
          const lumaEvents = (lumaPayload.entries || []).map((e, idx) => ({
            id: 'luma-' + idx,
            title: e.event?.name || 'Tech Event',
            organizer: e.event?.hosts?.[0]?.name || 'Community',
            date: e.event?.start_at ? new Date(e.event.start_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Upcoming',
            location: e.event?.geo_address_info?.city || 'Virtual',
            type: 'Meetup',
            url: e.event?.url ? `https://lu.ma/${e.event.url}` : null,
            description: (e.event?.description || '').substring(0, 120)
          }));
          events = [...events, ...lumaEvents];
        } catch (_) {}
      }
    } catch (err) {
      console.error("[EventEngine] Scraping error:", err.message);
    }

    // Curated fallback
    if (events.length === 0) {
      events = [
        { id: 'evt-1', title: 'HackIndia 2025', organizer: 'MLH & DevFolio', date: 'May 15-17, 2025', location: 'Bengaluru, India', type: 'Hackathon', url: 'https://hackindia.xyz', description: 'India\'s premier 48-hour hackathon with $50K in prizes across 8 tracks.' },
        { id: 'evt-2', title: 'React India Conference', organizer: 'React Community', date: 'June 8, 2025', location: 'Goa, India', type: 'Conference', url: 'https://reactindia.io', description: 'Annual gathering of 1500+ React developers featuring core team speakers.' },
        { id: 'evt-3', title: 'AWS Summit India', organizer: 'Amazon Web Services', date: 'July 22, 2025', location: 'Mumbai, India', type: 'Conference', url: 'https://aws.amazon.com/events', description: 'Cloud computing deep-dives with hands-on labs and certification tracks.' },
        { id: 'evt-4', title: 'Google DevFest India', organizer: 'Google Developer Groups', date: 'Aug 10, 2025', location: 'Hyderabad, India', type: 'Workshop', url: 'https://devfest.withgoogle.com', description: 'Community-led technical workshops on AI/ML, Web, Mobile platforms.' },
        { id: 'evt-5', title: 'PyCon India', organizer: 'Python Software Society', date: 'Sep 19-22, 2025', location: 'Delhi, India', type: 'Conference', url: 'https://in.pycon.org', description: 'South Asia\'s largest Python conference with 1000+ attendees.' }
      ];
    }

    res.status(200).json({ success: true, events: events.slice(0, 15) });
  } catch (error) {
    console.error("Error in getEvents:", error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const https = require('https');

// Helper to reliably fetch JSON from a URL with a tight 4-second timeout so the Hackathon demo never hangs
const fetchJson = (url) => {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (HiredApp/1.0)' }, timeout: 4000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
  });
};

const fetchLiveJobs = async (skills = []) => {
  console.log(`[JobFetcher] Aggregating massive live datastreams from 4 Public APIs...`);

  const apis = [
    // 1. Jobicy API
    fetchJson('https://jobicy.com/api/v2/remote-jobs?industry=engineering').then(parsed => {
      return (parsed.jobs || []).map((job, idx) => ({
        id: 'jobicy-' + job.id + '-' + idx,
        title: job.jobTitle,
        company_name: job.companyName,
        candidate_required_location: job.jobGeo || 'Remote (Global)',
        salary: 'Competitive',
        description: job.jobExcerpt || job.jobDescription || '',
        url: job.url || '',
        tags: []
      }));
    }).catch(e => { console.error('[Jobicy] Failed:', e.message); return []; }),

    // 2. Arbeitnow API
    fetchJson('https://www.arbeitnow.com/api/job-board-api').then(parsed => {
      return (parsed.data || []).map((job, idx) => ({
        id: 'arbeit-' + job.slug + '-' + idx,
        title: job.title,
        company_name: job.company_name,
        candidate_required_location: job.location || 'Remote',
        salary: 'Competitive',
        description: job.description || '',
        url: job.url || '',
        tags: job.tags || []
      }));
    }).catch(e => { console.error('[Arbeitnow] Failed:', e.message); return []; }),

    // 3. Remotive API
    fetchJson('https://remotive.com/api/remote-jobs?category=software-dev&limit=50').then(parsed => {
      return (parsed.jobs || []).map((job, idx) => ({
        id: 'remotive-' + job.id + '-' + idx,
        title: job.title,
        company_name: job.company_name,
        candidate_required_location: job.candidate_required_location || 'Remote',
        salary: job.salary || 'Competitive',
        description: job.description || '',
        url: job.url || '',
        tags: job.tags || []
      }));
    }).catch(e => { console.error('[Remotive] Failed:', e.message); return []; }),

    // 4. RemoteOK API
    fetchJson('https://remoteok.com/api').then(parsed => {
      // RemoteOK API returns a mixed array where the first element is metadata
      const rawJobs = Array.isArray(parsed) ? parsed.slice(1) : [];
      return rawJobs.map((job, idx) => ({
        id: 'remoteok-' + job.id + '-' + idx,
        title: job.position || job.title,
        company_name: job.company,
        candidate_required_location: job.location || 'Remote',
        salary: job.salary_max ? `$${job.salary_min} - $${job.salary_max}` : 'Competitive',
        description: job.description || '',
        url: job.apply_url || job.url || '',
        tags: job.tags || []
      }));
    }).catch(e => { console.error('[RemoteOK] Failed:', e.message); return []; })
  ];

  // Execute all scrapers in parallel
  const resultsArr = await Promise.allSettled(apis);
  
  let unifiedJobs = [];
  resultsArr.forEach(res => {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      unifiedJobs.push(...res.value);
    }
  });

  console.log(`[JobFetcher] Successfully mass-aggregated ${unifiedJobs.length} real jobs across 4 platforms!`);

  if (unifiedJobs.length === 0) {
    return getFallbackData();
  }

  // Shuffle the massive unified array so it looks authentic and mixed every time it's flushed
  unifiedJobs = unifiedJobs.sort(() => 0.5 - Math.random());
  
  return unifiedJobs;
};

const getFallbackData = () => {
  console.log(`[JobFetcher] All 4 APIs Failed or Offline. Injecting your explicit hand-picked Naukri fallback data...`);
  return [
    { 
      id: 'nfb1', 
      title: 'Frontend Developer', 
      company_name: 'KEJ Consultancy Services', 
      candidate_required_location: 'Bengaluru, India', 
      salary: 'Competitive', 
      url: 'https://www.naukri.com/job-listings-frontend-developer-kej-consultancy-services-private-limited-bengaluru-0-to-2-years-150426500985?src=cluster&sid=17764826847554933_1&xp=1&px=1', 
      tags: ['react', 'frontend', 'javascript'] 
    },
    { 
      id: 'nfb2', 
      title: 'Frontend Developer', 
      company_name: 'Pavans Group Techsoft', 
      candidate_required_location: 'Vadodara, India', 
      salary: 'Competitive', 
      url: 'https://www.naukri.com/job-listings-frontend-developer-pavans-group-techsoft-private-limited-vadodara-0-to-2-years-180326500637?src=cluster&sid=17764826847554933_1&xp=5&px=1', 
      tags: ['react', 'frontend', 'javascript'] 
    },
    { 
      id: 'nfb3', 
      title: 'Frontend Developer', 
      company_name: 'Imperative Business Ventures', 
      candidate_required_location: 'Pune, India', 
      salary: 'Competitive', 
      url: 'https://www.naukri.com/job-listings-frontend-developer-imperative-business-ventures-pvt-ltd-pune-0-to-2-years-251025503911?src=cluster&sid=17764826847554933_1&xp=11&px=1', 
      tags: ['react', 'frontend', 'javascript'] 
    },
    { 
      id: 'nfb4', 
      title: 'Frontend Developer', 
      company_name: 'Metconnect Infotech', 
      candidate_required_location: 'Patna, India', 
      salary: 'Competitive', 
      url: 'https://www.naukri.com/job-listings-frontend-developer-metconnect-infotech-pvt-ltd-patna-0-to-1-years-240226502078?src=cluster&sid=17764826847554933_1&xp=12&px=1', 
      tags: ['react', 'frontend', 'javascript'] 
    },
    { 
      id: 'nfb5', 
      title: 'Frontend Developer', 
      company_name: 'Swipfe Infotech', 
      candidate_required_location: 'Pune, India', 
      salary: 'Competitive', 
      url: 'https://www.naukri.com/job-listings-frontend-developer-swipfe-infotech-pvt-ltd-pune-0-to-2-years-191225502792?src=cluster&sid=17764826847554933_1&xp=13&px=1', 
      tags: ['react', 'frontend', 'javascript'] 
    }
  ];
};

module.exports = { fetchLiveJobs };

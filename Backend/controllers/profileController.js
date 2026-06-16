const User = require('../models/User');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// @desc    Trigger AI script to generate CV and save LaTeX to MongoDB
// @route   POST /api/profile/generate-cv
// @access  Public
exports.generateCV = async (req, res) => {
  try {
    const { userId, githubUrl, linkedinUrl, leetcodeUrl } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    // Save uploaded file path (multer will attach `req.file`)
    let resumePath = '';
    if (req.file) {
      resumePath = req.file.path;
    }

    // Prepare Python execution
    const agentPath = path.join(__dirname, '..', 'ai_agent');
    const pythonScript = path.join(agentPath, 'main.py');
    const venvPythonExecutable = path.join(agentPath, 'venv', 'bin', 'python3');

    // Remove any trailing slashes from URLs so python extracts the usernames if necessary
    // Our python script expects: python main.py <github> <leetcode> <linkedin> <resume_path>
    
    // Simple helper to extract username if full URL is given
    const extractUsername = (url) => {
      if (!url) return '';
      return url.split('/').filter(Boolean).pop();
    };

    const parseUsername = require('../utils/parseUsername');
    const { fetchUserProfile, fetchUserRepoDetails } = require('../services/githubScraperService');
    const { analyzeProfileWithGroq } = require('../services/githubGroqService');
    const { buildJobMatchResponse } = require('../utils/jobProfileNormalizer');
    const crypto = require('crypto');
    const os = require('os');

    const gitUser = parseUsername(githubUrl);

    let githubPrefetchPath = '';
    if (gitUser && gitUser.toLowerCase() !== 'none') {
      try {
        console.log(`[ProfileController] Starting JavaScript GitHub Scraper and Groq Analyzer for user: ${gitUser}...`);
        const profile = await fetchUserProfile(gitUser);
        const repoData = await fetchUserRepoDetails(gitUser, { maxRepos: 10, includeCode: true, maxFilesPerRepo: 5 });
        const aiReport = await analyzeProfileWithGroq(profile, repoData.repos, repoData.primaryLanguages);
        const normalized = buildJobMatchResponse(aiReport, profile, repoData.stats);
        
        const tempId = crypto.randomUUID();
        githubPrefetchPath = path.join(os.tmpdir(), `${tempId}_github.json`);
        fs.writeFileSync(githubPrefetchPath, JSON.stringify(normalized, null, 2), 'utf-8');
        console.log(`[ProfileController] GitHub analysis completed and saved to ${githubPrefetchPath}`);
      } catch (err) {
        console.error(`[ProfileController] Warning: failed to fetch/analyze GitHub details: ${err.message}. AI agent will try to fallback.`);
      }
    }
    
    // Explicitly skip leetcode by passing 'none' as requested
    const args = [
      pythonScript,
      gitUser || 'none',
      'none',
      linkedinUrl || 'none',
      resumePath || 'none'
    ];

    console.log(`[AI Triggering...] Using python command: ${venvPythonExecutable} ${args.join(' ')}`);

    const spawnEnv = { ...process.env };
    if (githubPrefetchPath) {
      spawnEnv.GITHUB_PREFETCHED_DATA_PATH = githubPrefetchPath;
    }

    const pythonProcess = spawn(venvPythonExecutable, args, { cwd: agentPath, env: spawnEnv });

    let stdoutData = '';
    let stderrData = '';

    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
      console.log(`[AI Output]: ${data.toString()}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
      console.log(`[AI Error]: ${data.toString()}`);
    });

    pythonProcess.on('close', async (code) => {
      // Find the JSON output substring that python generates explicitly
      const jsonStart = stdoutData.indexOf('--- JSON OUTPUT ---');
      
      let aiResult = {};
      
      if (jsonStart !== -1) {
        try {
          const rawString = stdoutData.substring(jsonStart);
          const lines = rawString.split('\n');
          // Find the first line that looks like our expected JSON payload
          const jsonLine = lines.find(line => line.trim().startsWith('{') && line.trim().endsWith('}'));
          
          if (jsonLine) {
            aiResult = JSON.parse(jsonLine.trim());
          }
        } catch (err) {
          console.error("Could not parse JSON output from Python:", err);
        }
      }

      // Cleanup uploaded PDF file after processing
      if (resumePath && fs.existsSync(resumePath)) {
        fs.unlinkSync(resumePath);
      }

      // Cleanup pre-fetched GitHub JSON file
      if (githubPrefetchPath && fs.existsSync(githubPrefetchPath)) {
        try {
          fs.unlinkSync(githubPrefetchPath);
        } catch (e) {
          // ignore
        }
      }

      if (code === 0 && aiResult.status === 'success' && aiResult.output_file) {
        
        // Read the generated LaTeX file
        const latexContent = fs.readFileSync(aiResult.output_file, 'utf8');

        // Update User in DB
        const user = await User.findByIdAndUpdate(
          userId,
          {
            githubUrl,
            linkedinUrl,
            leetcodeUrl,
            cvLatex: latexContent,
            jobKeywords: aiResult.skills || [],
            githubData: aiResult.github_data || '',
            leetcodeData: aiResult.leetcode_data || '',
            resumeData: aiResult.resume_data || '',
            linkedinData: aiResult.linkedin_data || '',
            githubReposData: aiResult.github_repos_data || ''
          },
          { new: true, runValidators: true }
        );

        res.status(200).json({
          success: true,
          message: 'CV Generated and Saved',
          data: {
             latex: latexContent,
             user
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to generate CV via AI Engine',
          error: stderrData
        });
      }
    });

  } catch (error) {
    console.error("Error in generateCV:", error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const crypto = require('crypto');
const os = require('os');
const { execFile } = require('child_process');

// @desc    Compile LaTeX code to PDF
// @route   POST /api/profile/compile-latex
// @access  Public (Should be private in production)
exports.compileLatex = async (req, res) => {
  try {
    let { latexCode } = req.body;
    
    if (!latexCode) {
      return res.status(400).json({ success: false, message: 'LaTeX code is required' });
    }

    // Sanitize LaTeX for Tectonic (Remove fontspec which crashes if system fonts like Calibri aren't installed)
    latexCode = latexCode.replace(/\\usepackage(\[.*?\])?\{fontspec\}/g, '');
    latexCode = latexCode.replace(/\\setmainfont(\[.*?\])?\{.*?\}/g, '');
    latexCode = latexCode.replace(/\\setsansfont(\[.*?\])?\{.*?\}/g, '');
    
    // Correct common LLM option typos in itemize environments (e.g. noitemsep(topsep=0pt) -> noitemsep,topsep=0pt)
    latexCode = latexCode.replace(/noitemsep\(topsep=([^)]+)\)/g, 'noitemsep,topsep=$1');

    const tempId = crypto.randomUUID();
    const tmpDir = os.tmpdir();
    const texFilePath = path.join(tmpDir, `${tempId}.tex`);
    const pdfFilePath = path.join(tmpDir, `${tempId}.pdf`);

    // Write latex code to temp file
    fs.writeFileSync(texFilePath, latexCode);

    const { exec, execFile } = require('child_process');
    const tectonicPath = path.join(__dirname, '..', 'tectonic');

    const handleCompilationResult = (error, stdout, stderr) => {
      // Cleanup tex file immediately
      if (fs.existsSync(texFilePath)) fs.unlinkSync(texFilePath);

      // Even if there's a warning, tectonic might have generated the PDF.
      if (fs.existsSync(pdfFilePath)) {
        const pdfBuffer = fs.readFileSync(pdfFilePath);
        const pdfBase64 = pdfBuffer.toString('base64');
        
        // Cleanup pdf file
        fs.unlinkSync(pdfFilePath);

        return res.status(200).json({ success: true, pdfBase64 });
      } else {
        const rawError = stderr || stdout || (error ? error.message : '') || '';
        // Try to string clean the cryptic tempId out of the tectonic error
        const cleanError = rawError.replace(new RegExp(`${tempId}\\.tex:`, 'gi'), 'Line ');
        console.error('Tectonic Error:', cleanError);
        return res.status(500).json({ success: false, message: 'Failed to compile LaTeX', error: cleanError });
      }
    };

    if (fs.existsSync(tectonicPath)) {
      fs.chmodSync(tectonicPath, 0o755);
      execFile(tectonicPath, [texFilePath, '--outdir', tmpDir], handleCompilationResult);
    } else {
      console.log('[ProfileController] Local tectonic binary not found. Trying system tectonic...');
      const command = `export PATH=$PATH:/opt/homebrew/bin:/usr/local/bin && tectonic "${texFilePath}" --outdir "${tmpDir}"`;
      exec(command, handleCompilationResult);
    }

  } catch (error) {
    console.error("Error in compileLatex:", error);
    res.status(500).json({ success: false, message: 'Server Error during compilation' });
  }
};

// @desc    Confirm Resume and Extract Keywords
// @route   POST /api/profile/confirm-resume
// @access  Public (Should be private in production)
exports.confirmResume = async (req, res) => {
  try {
    const { userId, finalLatex } = req.body;

    if (!userId || !finalLatex) {
      return res.status(400).json({ success: false, message: 'User ID and final LaTeX are required' });
    }

    const agentPath = path.join(__dirname, '..', 'ai_agent');
    const extractScript = path.join(agentPath, 'extract_skills.py');
    
    // Check if venv python exists, else fallback to standard python3/python
    const venvPython = path.join(agentPath, 'venv', 'bin', 'python3');
    const systemPython = process.platform === 'win32' ? 'python' : 'python3';
    const pythonExec = fs.existsSync(venvPython) ? venvPython : systemPython;

    console.log(`[AI Triggering...] Spawning skills extractor: ${pythonExec} ${extractScript}`);

    const child = spawn(pythonExec, [extractScript], { cwd: agentPath });

    let stdoutData = '';
    let stderrData = '';

    child.stdin.write(finalLatex);
    child.stdin.end();

    child.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    child.on('close', async (code) => {
      let keywordsArray = [];
      if (code === 0) {
        try {
          keywordsArray = JSON.parse(stdoutData.trim());
        } catch (err) {
          console.error("Failed to parse extracted skills JSON:", err);
        }
      } else {
        console.error("extract_skills.py exited with error code:", code, stderrData);
      }

      console.log(`[AI Extracted Skills]: ${JSON.stringify(keywordsArray)}`);

      const user = await User.findByIdAndUpdate(
        userId,
        {
          cvLatex: finalLatex,
          jobKeywords: keywordsArray
        },
        { new: true, runValidators: true }
      );

      res.status(200).json({ 
        success: true, 
        message: 'Resume confirmed and keywords extracted', 
        jobKeywords: keywordsArray 
      });
    });

  } catch (error) {
    console.error("Error in confirmResume:", error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get user profile data (including LaTeX CV and extracted metrics)
// @route   GET /api/profile/:userId
// @access  Public (Should be protected in production)
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('+cvLatex');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("Error in getProfile:", error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

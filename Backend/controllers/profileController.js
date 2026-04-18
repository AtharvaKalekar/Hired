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

    const gitUser = extractUsername(githubUrl);
    const leetUser = extractUsername(leetcodeUrl);
    
    const args = [
      pythonScript,
      gitUser || 'none',
      leetUser || 'none',
      linkedinUrl || 'none',
      resumePath || 'none'
    ];

    console.log(`[AI Triggering...] Using python command: ${venvPythonExecutable} ${args.join(' ')}`);

    const pythonProcess = spawn(venvPythonExecutable, args, { cwd: agentPath });

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
            cvLatex: latexContent
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

    const tempId = crypto.randomUUID();
    const tmpDir = os.tmpdir();
    const texFilePath = path.join(tmpDir, `${tempId}.tex`);
    const pdfFilePath = path.join(tmpDir, `${tempId}.pdf`);

    // Write latex code to temp file
    fs.writeFileSync(texFilePath, latexCode);

    const tectonicPath = path.join(__dirname, '..', 'tectonic');

    // Make sure tectonic binary is executable
    if (fs.existsSync(tectonicPath)) {
      fs.chmodSync(tectonicPath, 0o755);
    } else {
      return res.status(500).json({ success: false, message: 'Tectonic compiler not found on server' });
    }

    execFile(tectonicPath, [texFilePath, '--outdir', tmpDir], (error, stdout, stderr) => {
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
        const rawError = stderr || stdout || error.message || '';
        // Try to string clean the cryptic tempId out of the tectonic error
        const cleanError = rawError.replace(new RegExp(`${tempId}\\.tex:`, 'gi'), 'Line ');
        console.error('Tectonic Error:', cleanError);
        return res.status(500).json({ success: false, message: 'Failed to compile LaTeX', error: cleanError });
      }
    });

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

    // A simple basic NLP regex mapper for technical keywords.
    // In a real production system, you would pass finalLatex to the LLM agent.
    const techStackDictionary = ['react', 'node.js', 'python', 'javascript', 'typescript', 'java', 'c\\+\\+', 'aws', 'docker', 'kubernetes', 'mongodb', 'sql', 'postgres', 'graphql', 'next.js', 'django', 'flask', 'spring boot'];
    
    let extractedKeywords = new Set();
    const lowerLatex = finalLatex.toLowerCase();
    
    for (let tech of techStackDictionary) {
      const regex = new RegExp(`\\b${tech}\\b`, 'i');
      if (regex.test(lowerLatex)) {
        extractedKeywords.add(tech.replace('\\+', '+'));
      }
    }

    const keywordsArray = Array.from(extractedKeywords);

    const user = await User.findByIdAndUpdate(
      userId,
      {
        cvLatex: finalLatex,
        jobKeywords: keywordsArray
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, message: 'Resume confirmed and keywords extracted', jobKeywords: keywordsArray });
  } catch (error) {
    console.error("Error in confirmResume:", error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

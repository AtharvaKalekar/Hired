const puppeteer = require('puppeteer-core');
const fs = require('fs');

/**
 * Headless Bot to automatically fill out Lever / Greenhouse Application Forms
 * @param {string} url - Target job URL (must be lever / greenhouse for this demo)
 * @param {object} profile - Basic user profile JSON
 * @param {string} resumePath - Absolute path to the tailored resume PDF
 * @param {function} updateLogs - Callback function to stream terminal strings to the frontend websocket/SSE (optional)
 * @returns {object} Final status of the auto-apply operation
 */
const executeAutoApply = async (url, profile, resumePath, updateLogs = () => { }) => {
  let browser;
  try {
    updateLogs('[1/5] Spinning up Chrome Headless Browser...');
    // Hook into the native Mac Google Chrome installation
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    updateLogs(`[2/5] Navigating to target ATS URL...`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Try to detect the ATS provider but treat everything dynamically
    const content = await page.content();
    const isLever = content.includes('jobs.lever.co');

    updateLogs(`[3/5] Mapping DOM structure... Hunting for Application Forms...`);

    if (isLever) {
      const applyBtn = await page.$('.postings-btn');
      if (applyBtn) await applyBtn.click();
      await new Promise(r => setTimeout(r, 1500));
    } else {
      // Universal "Apply" button hunter (e.g. for Workday or Jobicy external sites)
      const hasEmailInput = await page.$('input[type="email"], input[name*="email" i], input[id*="email" i]');
      if (!hasEmailInput) {
        updateLogs('[3.5/5] Form obscured. Hunting for "Apply" button...');
        const clickSuccess = await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
          const applyNode = elements.find(b => b.innerText && (b.innerText.toLowerCase().trim() === 'apply' || b.innerText.toLowerCase().trim() === 'apply now' || b.innerText.toLowerCase().includes('easy apply')));
          if (applyNode) {
            applyNode.click();
            return true;
          }
          return false;
        });
        if (clickSuccess) await new Promise(r => setTimeout(r, 3500)); // Give SPA time to render modal
      }
    }

    updateLogs(`[4/5] Injecting Semantic Data across universal DOM identifiers...`);

    // Aggressive Universal Heuristic Injection mapped over all visible inputs native to the page
    const inputs = await page.$$('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea');
    for (const input of inputs) {
      try {
        const boundingBox = await input.boundingBox();
        if (!boundingBox) continue; // Skip invisible inputs

        const signature = await page.evaluate(el => (el.name + " " + el.id + " " + el.placeholder + " " + el.getAttribute('aria-label')).toLowerCase(), input);
        const type = await page.evaluate(el => el.type, input);

        let injectVal = '';

        if (signature.includes('first') && signature.includes('name')) injectVal = profile.firstName || 'Tech';
        else if (signature.includes('last') && signature.includes('name')) injectVal = profile.lastName || 'Innovator';
        else if (signature.includes('name')) injectVal = (profile.firstName || 'Tech') + ' ' + (profile.lastName || '');
        else if (signature.includes('email') || type === 'email') injectVal = profile.email || 'hello@tech.com';
        else if (signature.includes('phone') || signature.includes('mobile') || type === 'tel') injectVal = profile.phone || '+91 9999999999';
        else if (signature.includes('linkedin')) injectVal = 'https://linkedin.com/in/user';
        else if (signature.includes('github')) injectVal = 'https://github.com/user';
        else if (signature.includes('portfolio') || signature.includes('website')) injectVal = 'https://hired-hackathon.com';
        else if (signature.includes('company') || signature.includes('org')) injectVal = 'Hackathon Winner Inc.';
        else if (signature.includes('city') || signature.includes('location')) injectVal = 'India';
        else if (signature.includes('university') || signature.includes('school')) injectVal = 'Computer Science University';
        else if (signature.includes('password') || type === 'password') injectVal = 'SecureApply@123!';

        if (injectVal) {
          // Safely clear and slowly type to trigger React/Vue synthetic events
          await input.click({ clickCount: 3 });
          await input.press('Backspace');
          await input.type(injectVal, { delay: 5 });
        }
      } catch (e) {
        // Input might be disabled or obscured, perfectly normal, skip silently.
      }
    }

    // Weapons-grade explicit File Upload logic
    if (fs.existsSync(resumePath)) {
      const fileInputs = await page.$$('input[type="file"]');
      if (fileInputs.length > 0) {
        updateLogs(`[4.5/5] Attaching internal localized PDF to ${fileInputs.length} generic File Node(s)...`);
        for (const f_node of fileInputs) {
          try { await f_node.uploadFile(resumePath); } catch (skip) { }
        }
      } else {
        updateLogs(`[4.5/5] WARNING: No file upload node detected on the DOM.`);
      }
    } else {
      updateLogs(`[4.5/5] ERROR: Resume PDF not found at ${resumePath}. Skipping upload.`);
    }

    // Hackathon Presentation Mock: We don't actually hit the final "Submit Application" button 
    // because we don't want to spam actual startups with synthetic resumes! 
    // Instead, we will take a HD screenshot of the heavily injected form as absolute proof.
    updateLogs(`[5/5] Capturing Omnidirectional Proof of completed form...`);
    await new Promise(r => setTimeout(r, 1000)); // Allow validation UI scripts to trigger green checkmarks
    const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 40, fullPage: false });

    await browser.close();
    return {
      success: true,
      message: 'Successfully filled out unknown application form natively!',
      screenshot: screenshotBuffer.toString('base64')
    };

  } catch (err) {
    if (browser) await browser.close();
    console.error('Puppeteer AutoApply Error:', err);
    throw err;
  }
};

module.exports = {
  executeAutoApply
};

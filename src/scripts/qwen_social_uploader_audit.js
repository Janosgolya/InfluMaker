const http = require('http');
const fs = require('fs');
const path = require('path');

const OLLAMA_HOST = '127.0.0.1';
const OLLAMA_PORT = 11434;
const MODEL = 'qwen2.5vl:latest';

async function queryQwen(prompt) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            model: MODEL,
            prompt: prompt,
            stream: false,
            options: {
                temperature: 0.1,
                num_predict: 2500
            }
        });

        const req = http.request({
            hostname: OLLAMA_HOST,
            port: OLLAMA_PORT,
            path: '/api/generate',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json.response || '');
                } catch (e) {
                    reject(new Error(`Failed to parse Qwen JSON response: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function runAudit() {
    console.log('======================================================');
    console.log('🧠 RUNNING QWEN 3.8 LOCAL AUDIT ON PINTEREST & REDDIT');
    console.log('======================================================\n');

    const pinterestCode = fs.readFileSync(path.join(__dirname, '../services/pinterest_browser_uploader.js'), 'utf8');
    const redditCode = fs.readFileSync(path.join(__dirname, '../services/reddit_browser_uploader.js'), 'utf8');

    const prompt = `
You are a Principal Playwright Automation & Social Media Integration Engineer.
We are auditing two automated uploaders for Betty Ryal (an 18th-century influencer):

1. PINTEREST UPLOADER:
The user reported: "Na pintereście zrobiliście dwa drafty ale są nie opublikowane" (Pinterest created drafts instead of publishing live pins to the board).

2. REDDIT UPLOADER:
The user reported: "Na Reddicie nie ma nic w historii" (Reddit post was logged as successful, but nothing appeared in Reddit history, and URL stayed at https://www.reddit.com/r/aiArt/submit/?type=TEXT).

Here is the source code of both uploaders:

--- PINTEREST UPLOADER (pinterest_browser_uploader.js) ---
${pinterestCode}

--- REDDIT UPLOADER (reddit_browser_uploader.js) ---
${redditCode}

Please analyze:
1. PINTEREST ROOT CAUSES: Why did the pins get saved as drafts instead of being published? Examine the board selection, modal handling, publish button selectors ('button[data-test-id="board-dropdown-save-button"]' vs Pinterest's real publish button), and missing verification of successful publish redirection/toast.
2. REDDIT ROOT CAUSES: Why did Reddit fail to submit? Examine media tab selection, community selector, title/image readiness, subreddit flair requirement, submit button enablement/disabled state, and why false positives occurred (returning success: true even when still on /submit/).
3. ACTIONABLE FIRST-PRINCIPLES FIXES: Detail the exact modifications needed for both uploaders so they strictly guarantee:
   - Real board publication on Pinterest with dismissal of draft state and URL/toast confirmation.
   - Real post creation on Reddit with verification that the URL left /submit/ and redirected to the live post /comments/ thread, with retry on disabled buttons.

Provide clear, concrete architectural instructions and code patterns.
`;

    try {
        console.log('⏳ Consulting Qwen 3.8 on local RTX 3060...');
        const response = await queryQwen(prompt);
        console.log('\n======================================================');
        console.log('📋 QWEN AUDIT REPORT');
        console.log('======================================================\n');
        console.log(response);

        const auditReportPath = path.join(__dirname, '../../config/qwen_pinterest_reddit_audit.md');
        fs.writeFileSync(auditReportPath, `# Qwen 3.8 Audit Report: Pinterest & Reddit Uploaders\n\n${response}`, 'utf8');
        console.log(`\n💾 Saved audit report to: ${auditReportPath}`);
    } catch (e) {
        console.error('Audit execution error:', e.message);
    }
}

runAudit();

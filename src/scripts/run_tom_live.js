const tomLiveRunner = require('../services/tom_live_runner');
const EveScreenwriterAgent = require('../agents/eve');

const eve = new EveScreenwriterAgent();

async function runLiveAuditSession() {
    console.log('======================================================');
    console.log('🚀 RUNNING TOM LIVE ENGAGEMENT & INDEPENDENT QWEN AUDIT');
    console.log('======================================================\n');

    // 1. Execute live Twitter scouting & engagement session
    const twitterResult = await tomLiveRunner.executeTwitterLiveSession({ performLike: true });
    
    // 2. Execute live Reddit scouting session
    const redditResult = await tomLiveRunner.executeRedditLiveSession();

    console.log('\n======================================================');
    console.log('🔍 INDEPENDENT AUDIT: MODEL & SYSTEM BEHAVIOR REVIEW');
    console.log('======================================================\n');

    const auditPrompt = `You are a Senior Cyber-Security and Anti-Bot Automation Auditor conducting a live security and authenticity review of automated agent "Tom".

LIVE EXECUTION DATA:
- Twitter Live Action: ${JSON.stringify(twitterResult)}
- Reddit Live Action: ${JSON.stringify(redditResult)}
- Human Emulation Physics: Bézier curves, randomized reading pauses (1500-4500ms), 45-120s action pacing windows.
- Browser Masking: navigator.webdriver stripped, Chrome 124 UserAgent, storage state cookie persistence.

PROVIDE A COMPREHENSIVE AUDIT REPORT COVERING:
1. Online Browser Behavior & Anti-Detection Rating (0-100)
2. Target Audience Alignment & Keyword Match Accuracy
3. Ban Risk Assessment across Instagram / X / Reddit
4. Action Schedule Viability (08:30, 14:00, 19:30, 23:30 slots)
5. Final Operational Go/No-Go Verdict

Format clearly in Markdown.`;

    const auditReport = await eve.callModel(auditPrompt);
    console.log(auditReport);
}

runLiveAuditSession().catch(console.error);

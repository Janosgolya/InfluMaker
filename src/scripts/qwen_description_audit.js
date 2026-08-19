const EveScreenwriterAgent = require('../agents/eve');
const fs = require('fs');
const path = require('path');

async function runQwenDescriptionAudit() {
    console.log('======================================================');
    console.log('🧠 RUNNING QWEN 3.8 DEEP AUDIT: DESCRIPTION & FORMATTING SYSTEM');
    console.log('======================================================\n');

    const sampleStoryPath = path.join(__dirname, '../../BettyRyal_18centuryServant/Selected_Content/MORNING/MORNING_SFW_Q8_S1_hf_20260816_174906_0ec393fc-7d80-4843-9796-405c5b7481f6.story.txt');
    const sampleContent = fs.existsSync(sampleStoryPath) ? fs.readFileSync(sampleStoryPath, 'utf8') : 'No sample file found';

    const auditPrompt = `You are a Principal Software Architect and Creative Director conducting an in-depth audit of the description generation and formatting pipeline for virtual influencer "Betty Ryal" (an 18th-century London servant girl writing secret diaries).

CURRENT PROBLEM OBSERVED ON X (TWITTER) & OTHER PLATFORMS:
1. Twitter/X posts have formatting errors (broken line breaks, wrapped quotes, embedded hashtags inside sentences, missing X format in older files, raw markdown headers leaking, erratic character length truncation).
2. The current codebase relies too much on reactive exception-stripping (regex hacks) rather than a solid, first-principles formatting system.
3. Character immersion is sometimes broken by meta-labels, parenthetical notes, or artificial text structures.

SAMPLE RAW STORY FILE CURRENTLY ON DISK:
"""
${sampleContent.substring(0, 1500)}
"""

CURRENT PARSING CODE IN TWITTER_SERVICE:
"""
if (raw.includes('TWITTER') || raw.includes('SECTION 3')) {
    const twSection = raw.split(/TWITTER|SECTION 3/i)[1] || '';
    const lines = twSection.split('\\n').map(l => l.trim()).filter(Boolean);
    const textLines = lines.filter(l => !l.startsWith('###') && !l.toLowerCase().includes('section'));
    if (textLines.length > 0) {
        const joined = textLines.join('\\n');
        if (joined.length > 10) tweetText = joined;
    }
}
"""

CONDUCT A COMPREHENSIVE ARCHITECTURAL AUDIT COVERING:
1. Root Causes Analysis: Why does the current generation + consumption system fail?
2. First-Principles System Design: How should Eve (generator) and Ana (consumer/formatter) be architected?
3. Exact Character Immersion Rules for Betty Ryal (18th-century voice, zero meta-text, clean prose, platform-adapted lengths).
4. Proposed Unified Story Schema & Robust Universal Parser Specification.
5. Migration & Fix Strategy for all existing .story.txt files in the repository.

Format your report clearly in Markdown.`;

    const eve = new EveScreenwriterAgent();
    const auditReport = await eve.callModel(auditPrompt);
    console.log(auditReport);

    const reportPath = path.join(__dirname, '../../config/qwen_description_formatting_audit.md');
    fs.writeFileSync(reportPath, auditReport, 'utf8');
    console.log(`\n📄 Full Qwen Audit Report saved to: ${reportPath}`);
}

runQwenDescriptionAudit().catch(console.error);

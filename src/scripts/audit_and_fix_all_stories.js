const fs = require('fs');
const path = require('path');
const storyParser = require('../services/story_parser');
const EveScreenwriterAgent = require('../agents/eve');

/**
 * Script: audit_and_fix_all_stories.js
 * Scans, audits, standardizes, and repairs all .story.txt files in the repository.
 */
async function auditAndFixAllStories() {
    console.log('======================================================');
    console.log('🧹 AUDITING & FIXING ALL STORY FILES (DUAL-AGENT PASS)');
    console.log('======================================================\n');

    const baseDir = path.join(__dirname, '../../BettyRyal_18centuryServant');
    const foldersToScan = [
        path.join(baseDir, 'Selected_Content/MORNING'),
        path.join(baseDir, 'Selected_Content/MIDDAY'),
        path.join(baseDir, 'Selected_Content/PREP'),
        path.join(baseDir, 'Selected_Content/NIGHT'),
        path.join(baseDir, 'RawGenerations')
    ];

    let allStoryFiles = [];

    for (const folder of foldersToScan) {
        if (!fs.existsSync(folder)) continue;
        const findStories = (dir) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    findStories(fullPath);
                } else if (entry.isFile() && entry.name.endsWith('.story.txt')) {
                    allStoryFiles.push(fullPath);
                }
            }
        };
        findStories(folder);
    }

    console.log(`Found ${allStoryFiles.length} story files across the repository.\n`);

    let fixedCount = 0;
    const auditResults = [];

    for (let i = 0; i < allStoryFiles.length; i++) {
        const filePath = allStoryFiles[i];
        const fileName = path.basename(filePath);
        const rawContent = fs.readFileSync(filePath, 'utf8');

        // Parse with first-principles StoryParser
        const parsed = storyParser.parse(rawContent);

        // Standardize 6 sections cleanly
        const cleanContent = `================================================================================
🎭 INFLUMAKER - EVE SCREENWRITER AGENT
================================================================================
Image File: ${fileName.replace('.story.txt', '.png')}
Character: ${parsed.metadata.character}
Theme: ${parsed.metadata.theme}
Sensuality: ${parsed.metadata.sensuality}
Generated At: ${new Date().toISOString()}

👁️ VISUAL SCENE SUMMARY:
${parsed.metadata.sceneSummary || "An intimate 18th-century scene of Betty Ryal in the London manor."}

================================================================================
### SECTION 1: 📱 TIKTOK FORMAT
#### ON-SCREEN TEXT HOOK:
${parsed.tiktok.hook}

#### SPOKEN NARRATIVE / VOICEOVER:
${parsed.tiktok.voiceover}

#### CAPTION & BIO REDIRECT:
${parsed.tiktok.caption}

#### HASHTAGS:
${parsed.tiktok.rawHashtags.join(' ')}

### SECTION 2: 📸 INSTAGRAM FORMAT
#### OPENING HOOK LINE:
${parsed.instagram.hook}

#### INTIMATE DIARY EXCERPT:
${parsed.instagram.excerpt}

#### ENGAGEMENT QUESTION:
${parsed.instagram.question}

#### FANVUE LINK-IN-BIO CTA:
${parsed.instagram.cta}

#### HASHTAGS:
${parsed.instagram.hashtags.join(' ')}

### SECTION 3: 💋 FANVUE FORMAT
#### SUBSCRIBER DIARY CONFESSION:
${parsed.fanvue.confession}

#### PAYWALL & PPV TEASER PITCH:
${parsed.fanvue.teaser}

#### TIP MENU & VIP CTA:
${parsed.fanvue.vip}

### SECTION 4: 📌 PINTEREST FORMAT
#### TITLE:
${parsed.pinterest.title}

#### DESCRIPTION:
${parsed.pinterest.description}

#### BOARD:
${parsed.pinterest.board}

#### LINK:
${parsed.pinterest.link}

### SECTION 5: 🤖 REDDIT FORMAT
#### POST TITLE:
${parsed.reddit.title}

#### TARGET SUBREDDITS:
${parsed.reddit.subreddits}

#### FIRST COMMENT:
${parsed.reddit.comment}

### SECTION 6: 🐦 X (TWITTER) FORMAT
#### TWEET TEXT:
${parsed.twitter.body}

#### CALLOUT LINK:
${parsed.twitter.link}

#### HASHTAGS:
${parsed.twitter.hashtags.join(' ')}
================================================================================
`;

        fs.writeFileSync(filePath, cleanContent, 'utf8');
        fixedCount++;
        console.log(`✅ [${i+1}/${allStoryFiles.length}] Standardized & Formatted: ${fileName}`);
        
        auditResults.push({
            file: fileName,
            twitterLength: parsed.twitter.fullTweet.length,
            instagramHashtags: parsed.instagram.hashtags.length,
            hasAsianChars: /[\u3000-\u303f\u4e00-\u9fff]/.test(cleanContent)
        });
    }

    console.log(`\n======================================================`);
    console.log(`🎉 ALL ${fixedCount} STORY FILES STANDARDIZED TO FIRST-PRINCIPLES SCHEMA`);
    console.log(`======================================================\n`);

    // Verify a sample with Qwen for 100% immersion
    console.log('🤖 Running Qwen Immersion Verification on random repaired file...');
    const randomFile = allStoryFiles[Math.floor(Math.random() * allStoryFiles.length)];
    const sampleRepaired = fs.readFileSync(randomFile, 'utf8');

    const eve = new EveScreenwriterAgent();
    const qwenVerifyPrompt = `You are Qwen QC Quality Inspector evaluating the newly standardized story file for Betty Ryal.

FILE CONTENT:
"""
${sampleRepaired}
"""

AUDIT THE REPAIRED FILE:
1. Character Immersion (Is it 100% Betty Ryal, 18th century, no meta-labels or broken quotes?)
2. Twitter / X Format Validity (Is Section 6 present and under 280 characters with clean link?)
3. Instagram, TikTok, Reddit, Fanvue, Pinterest Cleanliness (Are all 6 sections properly formed?)
4. Final Quality Score (0-100) and Verdict.`;

    const qwenResult = await eve.callModel(qwenVerifyPrompt);
    console.log('\n--- QWEN IMMERSION VERIFICATION REPORT ---');
    console.log(qwenResult);
}

auditAndFixAllStories().catch(console.error);

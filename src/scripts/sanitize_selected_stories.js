const fs = require('fs');
const path = require('path');
const storyParser = require('../services/story_parser');

const BASE_DIR = path.resolve(__dirname, '../../BettyRyal_18centuryServant/Selected_Content');

function sanitizeAllStories() {
    console.log(`\n======================================================`);
    console.log(`🧹 STORY SANITIZER: Grounding captions to visual scenes`);
    console.log(`Directory: ${BASE_DIR}`);
    console.log(`======================================================\n`);

    if (!fs.existsSync(BASE_DIR)) {
        console.error(`Directory not found: ${BASE_DIR}`);
        return;
    }

    const files = [];
    function findStories(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                findStories(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.story.txt')) {
                files.push(fullPath);
            }
        }
    }

    findStories(BASE_DIR);
    console.log(`Found ${files.length} .story.txt files in Selected_Content.\n`);

    let updatedCount = 0;
    let corsetRemovedCount = 0;
    let tweetsUpdatedCount = 0;

    for (const filePath of files) {
        let content = fs.readFileSync(filePath, 'utf8');
        const parsed = storyParser.parse(content);
        const meta = parsed.metadata;
        const sceneSummary = meta.sceneSummary || '';
        const theme = meta.theme || 'MORNING';
        const context = storyParser.detectVisualContext(sceneSummary, theme);

        let changed = false;

        // 1. Check and fix Instagram Engagement Question & Excerpt in raw content
        const rawQuestionMatch = content.match(/#### ENGAGEMENT QUESTION:\s*\n([^\n#]+)/i);
        const rawQuestion = rawQuestionMatch ? rawQuestionMatch[1].trim() : '';
        const rawHasCorsetConflict = !context.isCorsetOrDressing && /\b(corset|stays|lace my|lace her)\b/i.test(rawQuestion);

        if (rawHasCorsetConflict || !rawQuestion || rawQuestion.length < 15) {
            const newQuestion = storyParser.generateContextualQuestion(sceneSummary, theme, '');
            // Replace ENGAGEMENT QUESTION section
            const qRegex = /(#### ENGAGEMENT QUESTION:\s*\n)([\s\S]*?)(?=\n####|\n###|$)/i;
            if (qRegex.test(content)) {
                content = content.replace(qRegex, `$1${newQuestion}\n`);
                corsetRemovedCount++;
                changed = true;
            }
        }

        // Sanitize excerpt, voiceover, and fanvue in file if corset mentioned without corset context
        if (!context.isCorsetOrDressing) {
            const excerptRegex = /(#### INTIMATE DIARY EXCERPT:\s*\n)([\s\S]*?)(?=\n####|\n###|$)/i;
            const match = content.match(excerptRegex);
            if (match && /\b(corset|stays|lace my|lace her)\b/i.test(match[2])) {
                const sanitizedExcerpt = storyParser.sanitizeNarrativeExcerpt(match[2], sceneSummary, theme);
                content = content.replace(excerptRegex, `$1${sanitizedExcerpt}\n`);
                changed = true;
            }

            const voRegex = /(#### SPOKEN NARRATIVE[^\n]*:\s*\n)([\s\S]*?)(?=\n####|\n###|$)/i;
            const voMatch = content.match(voRegex);
            if (voMatch && /\b(corset|stays|lace my|lace her)\b/i.test(voMatch[2])) {
                const cleanVo = storyParser.sanitizeNarrativeExcerpt(voMatch[2], sceneSummary, theme);
                content = content.replace(voRegex, `$1${cleanVo}\n`);
                changed = true;
            }

            const ttCapRegex = /(#### CAPTION & BIO REDIRECT:\s*\n)([\s\S]*?)(?=\n####|\n###|$)/i;
            const ttMatch = content.match(ttCapRegex);
            if (ttMatch && /\b(corset|stays|lace my|lace her)\b/i.test(ttMatch[2])) {
                const cleanTt = storyParser.sanitizeNarrativeExcerpt(ttMatch[2], sceneSummary, theme);
                content = content.replace(ttCapRegex, `$1${cleanTt}\n`);
                changed = true;
            }

            const fvRegex = /(#### SUBSCRIBER DIARY CONFESSION:\s*\n)([\s\S]*?)(?=\n####|\n###|$)/i;
            const fvMatch = content.match(fvRegex);
            if (fvMatch && /\b(corset|stays|lace my|lace her)\b/i.test(fvMatch[2])) {
                const cleanFv = storyParser.sanitizeNarrativeExcerpt(fvMatch[2], sceneSummary, theme);
                content = content.replace(fvRegex, `$1${cleanFv}\n`);
                changed = true;
            }
        }

        // 2. Check and fix Twitter Tweet Text in raw content
        const rawTwMatch = content.match(/#### TWEET TEXT:\s*\n([^\n]+)/i);
        const rawTweet = rawTwMatch ? rawTwMatch[1].trim() : '';
        const isStockCanned = [
            /When the candles burn down and the manor sleeps/i,
            /Before the London manor stirs, I write my quiet confessions/i,
            /Scrubbing the grand halls taught me/i,
            /Lacing heavy silk stays for the evening ball/i,
            /Caught in the quiet corridor of the manor/i,
            /Swipe up to read/i
        ].some(p => p.test(rawTweet));

        const tweetCorsetConflict = !context.isCorsetOrDressing && /\b(corset|stays)\b/i.test(rawTweet);

        if (isStockCanned || tweetCorsetConflict || !rawTweet || rawTweet.length < 15) {
            const newTweet = storyParser.generateContextualTweet(sceneSummary, theme, '');
            const twRegex = /(#### TWEET TEXT:\s*\n)([\s\S]*?)(?=\n####|\n###|={10,}|$)/i;
            if (twRegex.test(content)) {
                content = content.replace(twRegex, `$1${newTweet}\n`);
                tweetsUpdatedCount++;
                changed = true;
            }
        }

        if (changed) {
            fs.writeFileSync(filePath, content, 'utf8');
            updatedCount++;
        }
    }

    console.log(`======================================================`);
    console.log(`📊 SANITIZATION REPORT:`);
    console.log(`- Total story files scanned: ${files.length}`);
    console.log(`- Files updated: ${updatedCount}`);
    console.log(`- Incongruous corset questions replaced: ${corsetRemovedCount}`);
    console.log(`- Generic/repeated tweets replaced with scene copy: ${tweetsUpdatedCount}`);
    console.log(`======================================================\n`);
}

if (require.main === module) {
    sanitizeAllStories();
}

module.exports = sanitizeAllStories;

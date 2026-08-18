/**
 * fix_story_meta_commentary.js
 * Retroactively strips LLM meta-commentary artifacts from all existing .story.txt files.
 * Targets patterns like: "(Exclusive, seductive tone)", "(Whispered, intimate)", etc.
 */

const fs = require('fs');
const path = require('path');

const SELECTED_CONTENT_DIR = path.join(__dirname, '../../BettyRyal_18centuryServant/Selected_Content');
const THEMES = ['MORNING', 'MIDDAY', 'PREP', 'NIGHT'];

function sanitizeStory(text) {
    if (!text) return '';

    let cleaned = text;

    // 1. Strip standalone parenthetical lines (entire line is a tone label)
    //    e.g. "(Exclusive, seductive tone)" on its own line
    cleaned = cleaned.replace(/^\s*\([^)]{0,80}\)\s*$/gm, '');

    // 2. Strip inline parenthetical tone prefix at start of a line before actual text
    //    e.g. "(Exclusive, seductive tone) "What happened..." -> "What happened..."
    //    e.g. "(Whispered) She reached for..." -> "She reached for..."
    cleaned = cleaned.replace(/^\s*\([^)]{0,80}\)\s*["""']?/gm, '');

    // 3. Strip named tone labels used as sentence prefixes
    //    e.g. "Exclusive, seductive tone: She..." -> "She..."
    const tonePrefixes = [
        /^(Exclusive,?\s+seductive\s+tone\s*:\s*)/gim,
        /^(Intimate\s+tone\s*:\s*)/gim,
        /^(Whispered,?\s+intimate\s*:\s*)/gim,
        /^(Seductive\s+tone\s*:\s*)/gim,
        /^(Note\s*:\s*(?=\S))/gim,
        /^(Narrator\s*:\s*)/gim,
        /^(Betty\s+speaks\s*:\s*)/gim,
        /^(In\s+a\s+[a-z\s,]+\s+tone\s*:\s*)/gim,
    ];
    for (const pattern of tonePrefixes) {
        cleaned = cleaned.replace(pattern, '');
    }

    // 4. Remove repeated/duplicated lines (keep first occurrence)
    const lines = cleaned.split('\n');
    const seen = new Set();
    const resultLines = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            resultLines.push('');
            continue;
        }
        if (trimmed.length > 15) {
            const normalized = trimmed.toLowerCase();
            if (seen.has(normalized)) continue;
            seen.add(normalized);
        }
        resultLines.push(trimmed);
    }

    return resultLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function fixStoryFile(filePath) {
    const original = fs.readFileSync(filePath, 'utf8');
    const fixed = sanitizeStory(original);

    if (fixed === original.trim()) {
        return { changed: false };
    }

    fs.writeFileSync(filePath, fixed + '\n', 'utf8');
    return { changed: true };
}

let totalFiles = 0;
let fixedFiles = 0;
let unchangedFiles = 0;

console.log('\n======================================================');
console.log('🧹 EVE STORY SANITIZER - Retroactive Meta-Commentary Fix');
console.log('======================================================\n');

for (const theme of THEMES) {
    const themeDir = path.join(SELECTED_CONTENT_DIR, theme);
    if (!fs.existsSync(themeDir)) continue;

    const storyFiles = fs.readdirSync(themeDir).filter(f => f.endsWith('.story.txt'));

    for (const file of storyFiles) {
        const filePath = path.join(themeDir, file);
        totalFiles++;

        const result = fixStoryFile(filePath);
        if (result.changed) {
            console.log(`✅ Fixed: ${theme}/${file}`);
            fixedFiles++;
        } else {
            unchangedFiles++;
        }
    }
}

console.log('\n======================================================');
console.log(`📊 SUMMARY:`);
console.log(`   Total .story.txt files scanned: ${totalFiles}`);
console.log(`   Files cleaned/fixed:            ${fixedFiles}`);
console.log(`   Files already clean:             ${unchangedFiles}`);
console.log('======================================================\n');

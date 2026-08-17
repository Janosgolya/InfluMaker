const EveScreenwriterAgent = require('../agents/eve');
const fs = require('fs');
const path = require('path');

async function runEveBatch() {
    console.log(`\n======================================================`);
    console.log(`✍️ EVE: BATCH STORY GENERATION FOR ALL NEW IMAGES`);
    console.log(`======================================================\n`);

    const eve = new EveScreenwriterAgent();
    const baseDir = path.join(__dirname, '../../BettyRyal_18centuryServant/Selected_Content');

    const unwritten = [];
    const themes = ['MORNING', 'MIDDAY', 'PREP', 'NIGHT'];

    for (const theme of themes) {
        const dir = path.join(baseDir, theme);
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir);
        const images = files.filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.webp') || f.endsWith('.jpeg'));
        for (const img of images) {
            const ext = path.extname(img);
            const baseName = path.basename(img, ext);
            const storyFile = path.join(dir, baseName + '.story.txt');
            if (!fs.existsSync(storyFile)) {
                unwritten.push(path.join(dir, img));
            }
        }
    }

    console.log(`Found ${unwritten.length} images requiring story generation.\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < unwritten.length; i++) {
        const imgPath = unwritten[i];
        const fileName = path.basename(imgPath);
        const theme = path.basename(path.dirname(imgPath));
        console.log(`\n▶️ [${i + 1}/${unwritten.length}] (${theme}) Generating stories for: ${fileName}`);

        try {
            await eve.generateStoryForImage(imgPath);
            successCount++;
            console.log(`✅ [${i + 1}/${unwritten.length}] Saved .story.txt for ${fileName}`);
        } catch (err) {
            console.error(`❌ [${i + 1}/${unwritten.length}] Error generating for ${fileName}:`, err.message);
            errorCount++;
        }
    }

    console.log(`\n======================================================`);
    console.log(`🎉 EVE BATCH GENERATION FINISHED!`);
    console.log(`Total: ${unwritten.length} | Succeeded: ${successCount} | Failed: ${errorCount}`);
    console.log(`======================================================\n`);
}

if (require.main === module) {
    runEveBatch().catch(console.error);
}

module.exports = runEveBatch;

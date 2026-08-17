const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '../../BettyRyal_18centuryServant/Selected_Content');

function fixNaming() {
    console.log(`\n======================================================`);
    console.log(`🔧 FIXING SELECTED CONTENT NAMING`);
    console.log(`======================================================\n`);

    const themes = ['MORNING', 'MIDDAY', 'PREP', 'NIGHT'];
    let renamedCount = 0;

    for (const theme of themes) {
        const themePath = path.join(baseDir, theme);
        if (!fs.existsSync(themePath)) continue;

        const files = fs.readdirSync(themePath);
        for (const file of files) {
            const ext = path.extname(file).toLowerCase();
            if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) continue;

            if (file.startsWith('REJECT_') || !file.startsWith(theme)) {
                // Determine category and scores from filename if present
                const catMatch = file.match(/(SFW|NSFW)/i);
                const category = catMatch ? catMatch[1].toUpperCase() : 'SFW';
                const qMatch = file.match(/_Q(\d+)_/i);
                const quality = qMatch ? qMatch[1] : '9';
                const sMatch = file.match(/_S(\d+)_/i);
                const sensuality = sMatch ? sMatch[1] : '1';

                // Extract core uuid / timestamp identifier
                let rawId = file.replace(/^REJECT_[A-Z_]+_/, '').replace(/^(MORNING|MIDDAY|PREP|NIGHT)_[A-Z_]+_/, '');
                // Clean up any remaining prefix
                rawId = rawId.replace(/^(SFW|NSFW)_Q\d+_S\d+_/, '');
                
                const newName = `${theme}_${category}_Q${quality}_S${sensuality}_${rawId}`;
                const oldFullPath = path.join(themePath, file);
                const newFullPath = path.join(themePath, newName);

                console.log(`[Renaming in ${theme}]`);
                console.log(`  From: ${file}`);
                console.log(`  To:   ${newName}`);

                fs.renameSync(oldFullPath, newFullPath);

                // Rename sidecar .txt if exists
                const oldTxt = path.join(themePath, file.replace(ext, '.txt'));
                const newTxt = path.join(themePath, newName.replace(ext, '.txt'));
                if (fs.existsSync(oldTxt)) {
                    fs.renameSync(oldTxt, newTxt);
                }

                // Rename sidecar .story.txt if exists
                const oldStory = path.join(themePath, file.replace(ext, '.story.txt'));
                const newStory = path.join(themePath, newName.replace(ext, '.story.txt'));
                if (fs.existsSync(oldStory)) {
                    fs.renameSync(oldStory, newStory);
                }

                renamedCount++;
            }
        }
    }

    console.log(`\n======================================================`);
    console.log(`✅ Renamed ${renamedCount} files to clean standardized format.`);
    console.log(`======================================================\n`);
}

fixNaming();

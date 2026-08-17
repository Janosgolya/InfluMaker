const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '../../BettyRyal_18centuryServant/Selected_Content');

function cleanDoubleTags() {
    const themes = ['MORNING', 'MIDDAY', 'PREP', 'NIGHT'];
    let count = 0;

    for (const theme of themes) {
        const themePath = path.join(baseDir, theme);
        if (!fs.existsSync(themePath)) continue;

        const files = fs.readdirSync(themePath);
        for (const file of files) {
            if (file.includes('_Q9_S1_Q9_S1_') || file.includes('_Q8_S1_Q8_S1_') || file.includes('_Q8_S3_Q8_S3_') || file.includes('_Q8_S5_Q8_S5_')) {
                const cleaned = file.replace(/_Q(\d+)_S(\d+)_Q\1_S\2_/, '_Q$1_S$2_');
                const oldPath = path.join(themePath, file);
                const newPath = path.join(themePath, cleaned);
                fs.renameSync(oldPath, newPath);

                const ext = path.extname(file);
                const oldTxt = path.join(themePath, file.replace(ext, '.txt'));
                const newTxt = path.join(themePath, cleaned.replace(ext, '.txt'));
                if (fs.existsSync(oldTxt)) fs.renameSync(oldTxt, newTxt);

                const oldStory = path.join(themePath, file.replace(ext, '.story.txt'));
                const newStory = path.join(themePath, cleaned.replace(ext, '.story.txt'));
                if (fs.existsSync(oldStory)) fs.renameSync(oldStory, newStory);

                count++;
            }
        }
    }
    console.log(`Cleaned up ${count} double tagged filenames.`);
}

cleanDoubleTags();

const AnaSocialManager = require('../agents/ana');
const fs = require('fs');
const path = require('path');

function checkTodayQueue() {
    console.log('======================================================');
    console.log('📋 AUDITING CONTENT QUEUE ACROSS ALL THEMES');
    console.log('======================================================\n');

    const ana = new AnaSocialManager();
    const themes = ['MORNING', 'MIDDAY', 'PREP', 'NIGHT'];
    const platforms = ['Fanvue', 'Instagram', 'Twitter', 'TikTok', 'Pinterest', 'Reddit'];

    for (const theme of themes) {
        console.log(`=== THEME: ${theme} ===`);
        for (const platform of platforms) {
            const next = ana.getNextContentForTheme(theme, platform);
            if (next) {
                console.log(`  🟢 ${platform.padEnd(10)}: Next ready -> ${path.basename(next.imagePath)}`);
            } else {
                console.log(`  ⚪ ${platform.padEnd(10)}: (None pending or all posted)`);
            }
        }
        console.log('');
    }
}

checkTodayQueue();

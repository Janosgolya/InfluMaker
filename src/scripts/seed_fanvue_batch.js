const AnaSocialManager = require('../agents/ana');

async function seedFanvue() {
    console.log(`\n======================================================`);
    console.log(`💎 SEEDING FANVUE POSTS (Target: 12+ total posts)`);
    console.log(`======================================================`);

    const ana = new AnaSocialManager();
    const themes = ['MIDDAY', 'PREP', 'NIGHT', 'MORNING', 'MIDDAY', 'PREP'];
    let publishedCount = 0;

    for (const theme of themes) {
        const nextItem = ana.getNextContentForTheme(theme, 'Fanvue');
        if (nextItem) {
            console.log(`\n[Seeder] Publishing ${theme} item: ${nextItem.imagePath}...`);
            try {
                const res = await ana.publishFanvueItem(nextItem.imagePath, nextItem.storyPath, { theme });
                console.log(`[Seeder] ✅ Published on Fanvue: UUID ${res.uuid}`);
                publishedCount++;
            } catch (err) {
                console.error(`[Seeder] ⚠️ Error publishing ${theme}:`, err.message);
            }
        } else {
            console.log(`[Seeder] No unposted item found for ${theme}`);
        }
    }

    console.log(`\n======================================================`);
    console.log(`🎉 Fanvue Seeding Complete! Published ${publishedCount} new posts.`);
    console.log(`======================================================\n`);
}

if (require.main === module) {
    seedFanvue().catch(console.error);
}

module.exports = seedFanvue;

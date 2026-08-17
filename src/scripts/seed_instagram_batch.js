const AnaSocialManager = require('../agents/ana');

async function seedInstagram() {
    console.log(`\n======================================================`);
    console.log(`📸 SEEDING INSTAGRAM GRID (Target: 9 total posts / 3x3 grid)`);
    console.log(`======================================================`);

    const ana = new AnaSocialManager();
    const themes = ['MIDDAY', 'PREP', 'NIGHT', 'MORNING', 'MIDDAY', 'PREP'];
    let publishedCount = 0;

    for (const theme of themes) {
        console.log(`\n[IG Seeder] Publishing ${theme} photo post to Instagram...`);
        try {
            const res = await ana.publishInstagramPost(theme);
            console.log(`[IG Seeder] ✅ Published on Instagram feed: ${res.file}`);
            publishedCount++;
        } catch (err) {
            console.error(`[IG Seeder] ⚠️ Error publishing ${theme}:`, err.message);
        }
    }

    console.log(`\n======================================================`);
    console.log(`🎉 Instagram Seeding Complete! Published ${publishedCount} new posts.`);
    console.log(`======================================================\n`);
}

if (require.main === module) {
    seedInstagram().catch(console.error);
}

module.exports = seedInstagram;

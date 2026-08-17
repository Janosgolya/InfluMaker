const AnaSocialManager = require('../agents/ana');
const path = require('path');

async function seedTikTok() {
    console.log(`\n======================================================`);
    console.log(`📱 SEEDING TIKTOK VIDEOS (Target: 5+ total videos)`);
    console.log(`======================================================`);

    const ana = new AnaSocialManager();
    const baseDir = path.join(__dirname, '../../BettyRyal_18centuryServant/TikTok_Ready_Content');
    const contentDir = path.join(__dirname, '../../BettyRyal_18centuryServant/Selected_Content');

    const videosToPost = [
        {
            video: path.join(baseDir, 'Betty_TikTok_Morning_Chore.mp4'),
            story: path.join(contentDir, 'MORNING', 'MORNING_SFW_Q8_S1_hf_20260816_174906_a5d906ce-3cbb-4c24-a2a9-7a81423023ca.story.txt'),
            theme: 'MORNING'
        },
        {
            video: path.join(baseDir, 'Betty_TikTok_Prep_Corset.mp4'),
            story: path.join(contentDir, 'PREP', 'PREP_SFW_Q9_S1_hf_20260816_171641_174cd1a3-b3be-4e24-a2ba-276c2c15c989.story.txt'),
            theme: 'PREP'
        },
        {
            video: path.join(baseDir, 'Betty_TikTok_Night_Tavern.mp4'),
            story: path.join(contentDir, 'NIGHT', 'NIGHT_SFW_Q8_S1_hf_20260816_175211_7e69b1ae-f74c-48a7-8391-d0309f3b0cf7.story.txt'),
            theme: 'NIGHT'
        }
    ];

    let publishedCount = 0;

    for (const item of videosToPost) {
        console.log(`\n[TikTok Seeder] Publishing: ${path.basename(item.video)}...`);
        try {
            const res = await ana.publishTikTokVideo(item.video, item.story, { theme: item.theme });
            console.log(`[TikTok Seeder] ✅ Published successfully!`);
            publishedCount++;
        } catch (err) {
            console.error(`[TikTok Seeder] ⚠️ Error publishing ${path.basename(item.video)}:`, err.message);
        }
    }

    console.log(`\n======================================================`);
    console.log(`🎉 TikTok Seeding Complete! Published ${publishedCount} new videos.`);
    console.log(`======================================================\n`);
}

if (require.main === module) {
    seedTikTok().catch(console.error);
}

module.exports = seedTikTok;

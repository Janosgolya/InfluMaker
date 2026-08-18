const path = require('path');
const fs = require('fs');
const RedditService = require('../services/reddit_service');

async function testPublishReddit() {
    console.log('======================================================');
    console.log('🤖 TESTING FIRST REDDIT POST PUBLICATION');
    console.log('======================================================\n');

    // Find first available image in MIDDAY
    const middayDir = path.join(__dirname, '../../BettyRyal_18centuryServant/Selected_Content/MIDDAY');
    const files = fs.readdirSync(middayDir).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));

    if (files.length === 0) {
        console.error('No images found in MIDDAY directory.');
        return;
    }

    const testImage = path.join(middayDir, files[0]);
    const ext = path.extname(files[0]);
    const base = path.basename(files[0], ext);
    const storyPath = path.join(middayDir, `${base}.story.txt`);

    console.log(`🖼️ Test Image: ${path.basename(testImage)}`);
    console.log(`📜 Story Path: ${path.basename(storyPath)}`);

    const result = await RedditService.publishPost(testImage, storyPath, {
        title: "Betty's quiet moment in the London mansion between morning chores [OC] [AI]",
        subreddit: 'aiArt', // Target subreddit
        firstComment: `Before the master rings the bell, I write down my quiet thoughts by candlelight... 🕯️\n\nRead the full uncensored diary entries through my bio link: https://fanvue.com/bettyryal`,
        isNsfw: false
    });

    console.log('\nResult:', result);
}

testPublishReddit().catch(console.error);

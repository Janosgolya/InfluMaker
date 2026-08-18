const path = require('path');
const fs = require('fs');
const twitterService = require('../services/twitter_service');

async function testPublishTweet() {
    console.log('======================================================');
    console.log('🐦 TESTING FIRST X (TWITTER) POST PUBLICATION');
    console.log('======================================================\n');

    // Find first available image in MORNING
    const morningDir = path.join(__dirname, '../../BettyRyal_18centuryServant/Selected_Content/MORNING');
    const files = fs.readdirSync(morningDir).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));

    if (files.length === 0) {
        console.error('No images found in MORNING directory.');
        return;
    }

    const testImage = path.join(morningDir, files[0]);
    const ext = path.extname(files[0]);
    const base = path.basename(files[0], ext);
    const storyPath = path.join(morningDir, `${base}.story.txt`);

    console.log(`🖼️ Test Image: ${path.basename(testImage)}`);
    console.log(`📜 Story Path: ${path.basename(storyPath)}`);

    const result = await twitterService.publishTweet(testImage, storyPath, {
        tweetText: `Before the London manor awakens, I light the candle and write down the house secrets... 🕯️\n\nFull uncensored diary entries: https://fanvue.com/bettyryal\n\n#BettyRyal #18thCentury #PeriodDrama #AIArt`
    });

    console.log('\nResult:', result);
}

testPublishTweet().catch(console.error);

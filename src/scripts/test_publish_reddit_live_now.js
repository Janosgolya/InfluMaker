const redditService = require('../services/reddit_service');
const path = require('path');

async function testReddit() {
    console.log('======================================================');
    console.log('🚀 EXECUTING LIVE REDDIT POST PUBLICATION');
    console.log('======================================================\n');

    const imagePath = 'D:\\AntigravityProjects\\InfluMaker\\BettyRyal_18centuryServant\\Selected_Content\\PREP\\PREP_SFW_Q9_S1_hf_20260816_174906_aa662b53-4419-4708-a3c8-908441a9ae61.png';
    const storyPath = 'D:\\AntigravityProjects\\InfluMaker\\BettyRyal_18centuryServant\\Selected_Content\\PREP\\PREP_SFW_Q9_S1_hf_20260816_174906_aa662b53-4419-4708-a3c8-908441a9ae61.story.txt';

    const result = await redditService.publishPost(imagePath, storyPath, {
        subreddit: 'HistoricalCostuming'
    });

    console.log('\nFinal Publishing Result:', JSON.stringify(result, null, 2));
}

testReddit().catch(console.error);

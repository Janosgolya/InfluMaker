const path = require('path');
const fs = require('fs');
const PinterestService = require('../services/pinterest_service');

async function testPublishFirstPin() {
    console.log('======================================================');
    console.log('📌 TESTING FIRST PINTEREST PIN PUBLICATION');
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

    const result = await PinterestService.publishPin(testImage, storyPath, {
        title: '18th Century London Maid by Candlelight 🕯️ | Betty Ryal Secrets',
        description: 'Before the manor stirs, I gather the linens by candlelight and listen to the quiet whispers of the great house. Step inside my private attic room to read tonight\'s full diary confessions. #18thCentury #PeriodDrama #FineArtPhotography #HistoricalRomance #CorsetAesthetic',
        boardName: '18th Century Aesthetic & Maid Secrets',
        link: 'https://fanvue.com/bettyryal'
    });

    console.log('\nResult:', result);
}

testPublishFirstPin().catch(console.error);

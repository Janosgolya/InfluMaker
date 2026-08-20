const { chromium } = require('playwright');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function testSetInputFiles() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: SESSION_PATH, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    const imagePath = 'D:\\AntigravityProjects\\InfluMaker\\BettyRyal_18centuryServant\\Selected_Content\\PREP\\PREP_SFW_Q9_S1_hf_20260816_174906_aa662b53-4419-4708-a3c8-908441a9ae61.png';

    await page.goto('https://www.reddit.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.goto('https://www.reddit.com/r/HistoricalCostuming/submit?type=IMAGE', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    console.log('Calling page.setInputFiles...');
    try {
        await page.setInputFiles('input[type="file"]', imagePath, { timeout: 10000 });
        console.log('page.setInputFiles succeeded!');
    } catch (e) {
        console.log('page.setInputFiles failed:', e.message);
    }

    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(__dirname, '../../config/reddit_page_setinputfiles.png') });
    console.log('Saved screenshot!');

    await browser.close();
}

testSetInputFiles().catch(console.error);

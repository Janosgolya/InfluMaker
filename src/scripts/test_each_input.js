const { chromium } = require('playwright');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function testEachInput() {
    const imagePath = 'D:\\AntigravityProjects\\InfluMaker\\BettyRyal_18centuryServant\\Selected_Content\\PREP\\PREP_SFW_Q9_S1_hf_20260816_174906_aa662b53-4419-4708-a3c8-908441a9ae61.png';

    for (let idx = 0; idx < 4; idx++) {
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({ storageState: SESSION_PATH, viewport: { width: 1440, height: 900 } });
        const page = await context.newPage();

        await page.goto('https://www.reddit.com/r/HistoricalCostuming/submit?type=IMAGE');
        await page.waitForTimeout(4000);

        const fileInputs = page.locator('input[type="file"]');
        const count = await fileInputs.count();
        if (idx < count) {
            console.log(`Testing input index #${idx}...`);
            await fileInputs.nth(idx).setInputFiles(imagePath);
            await page.waitForTimeout(4000);
            await page.screenshot({ path: path.join(__dirname, `../../config/reddit_input_${idx}.png`) });
            console.log(`Saved screenshot for index #${idx}`);
        }
        await browser.close();
    }
}

testEachInput().catch(console.error);

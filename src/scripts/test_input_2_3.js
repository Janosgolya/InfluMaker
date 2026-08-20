const { chromium } = require('playwright');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function testInput2and3() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: SESSION_PATH, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    const imagePath = 'D:\\AntigravityProjects\\InfluMaker\\BettyRyal_18centuryServant\\Selected_Content\\PREP\\PREP_SFW_Q9_S1_hf_20260816_174906_aa662b53-4419-4708-a3c8-908441a9ae61.png';

    await page.goto('https://www.reddit.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.goto('https://www.reddit.com/r/HistoricalCostuming/submit?type=IMAGE', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    const fileInputs = page.locator('input[type="file"]');
    const count = await fileInputs.count();
    console.log(`Found ${count} file inputs.`);

    for (let i = 0; i < count; i++) {
        console.log(`Input #${i}:`);
        try {
            await fileInputs.nth(i).setInputFiles(imagePath);
            console.log(`Successfully attached to input #${i}`);
            await page.waitForTimeout(3000);
            await page.screenshot({ path: path.join(__dirname, `../../config/reddit_test_input_${i}.png`) });
            console.log(`Saved screenshot for input #${i}`);
        } catch (e) {
            console.log(`Error on input #${i}:`, e.message);
        }
    }

    await browser.close();
}

testInput2and3().catch(console.error);

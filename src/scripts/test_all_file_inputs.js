const { chromium } = require('playwright');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function testAllFileInputs() {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    const imagePath = 'D:\\AntigravityProjects\\InfluMaker\\BettyRyal_18centuryServant\\Selected_Content\\PREP\\PREP_SFW_Q9_S1_hf_20260816_174906_aa662b53-4419-4708-a3c8-908441a9ae61.png';

    await page.goto('https://www.reddit.com/r/HistoricalCostuming/submit?type=IMAGE', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    const fileInputs = page.locator('input[type="file"]');
    const count = await fileInputs.count();
    console.log(`Found ${count} file inputs.`);

    for (let i = 0; i < count; i++) {
        try {
            console.log(`Setting file on input #${i}...`);
            await fileInputs.nth(i).setInputFiles(imagePath);
            await page.waitForTimeout(2000);
        } catch (e) {
            console.log(`Error on input #${i}:`, e.message);
        }
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(__dirname, '../../config/reddit_after_all_inputs.png') });
    console.log('Saved after all inputs screenshot!');

    await browser.close();
}

testAllFileInputs().catch(console.error);

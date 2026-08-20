const { chromium } = require('playwright');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function testFileChooser() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    const imagePath = 'D:\\AntigravityProjects\\InfluMaker\\BettyRyal_18centuryServant\\Selected_Content\\PREP\\PREP_SFW_Q9_S1_hf_20260816_174906_aa662b53-4419-4708-a3c8-908441a9ae61.png';

    console.log('Warming session on home...');
    await page.goto('https://www.reddit.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    console.log('Navigating to submit...');
    await page.goto('https://www.reddit.com/r/HistoricalCostuming/submit?type=IMAGE', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    console.log('Clicking upload area and listening for filechooser...');
    const dropzone = page.locator('div:has-text("Przeciągnij i upuść"), [aria-label*="multimedia" i], [data-testid*="dropzone"]').last();
    
    const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 8000 }),
        dropzone.click({ force: true })
    ]);

    if (fileChooser) {
        console.log('🎉 FileChooser captured! Setting files...');
        await fileChooser.setFiles(imagePath);
        await page.waitForTimeout(4000);
        console.log('✅ File set!');
    } else {
        console.log('❌ FileChooser was not triggered.');
    }

    await page.screenshot({ path: path.join(__dirname, '../../config/reddit_file_chooser_result.png') });
    console.log('Screenshot saved!');

    await browser.close();
}

testFileChooser().catch(console.error);

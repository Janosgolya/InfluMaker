const { chromium } = require('playwright');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function debugFileUpload() {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    const imagePath = 'D:\\AntigravityProjects\\InfluMaker\\BettyRyal_18centuryServant\\Selected_Content\\PREP\\PREP_SFW_Q9_S1_hf_20260816_174906_aa662b53-4419-4708-a3c8-908441a9ae61.png';

    await page.goto('https://www.reddit.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.goto('https://www.reddit.com/r/HistoricalCostuming/submit?type=IMAGE', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    // List all file inputs
    const inputs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('input[type="file"], input')).map(i => ({
            type: i.type,
            name: i.name,
            accept: i.accept,
            id: i.id,
            className: i.className
        }));
    });
    console.log('Inputs found:', inputs);

    // Upload file using file chooser or direct locator
    console.log('Attempting file upload via setInputFiles on all file inputs...');
    const fileInputs = page.locator('input[type="file"]');
    const count = await fileInputs.count();
    console.log(`Found ${count} input[type="file"]`);

    if (count > 0) {
        await fileInputs.first().setInputFiles(imagePath);
        console.log('Set input files on first file input');
        await page.waitForTimeout(4000);
    }

    // Also try clicking the upload button with fileChooser
    const uploadArea = page.locator('div:has-text("Przeciągnij i upuść"), [aria-label*="multimedia" i]').last();
    if (await uploadArea.isVisible()) {
        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null),
            uploadArea.click().catch(() => {})
        ]);
        if (fileChooser) {
            console.log('FileChooser opened! Setting files...');
            await fileChooser.setFiles(imagePath);
            await page.waitForTimeout(4000);
        }
    }

    await page.screenshot({ path: path.join(__dirname, '../../config/reddit_file_upload_debug.png') });
    console.log('Saved file upload debug screenshot!');

    await browser.close();
}

debugFileUpload().catch(console.error);

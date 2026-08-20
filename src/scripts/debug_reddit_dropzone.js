const { chromium } = require('playwright');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function inspectDropzone() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: SESSION_PATH, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    const imagePath = 'D:\\AntigravityProjects\\InfluMaker\\BettyRyal_18centuryServant\\Selected_Content\\PREP\\PREP_SFW_Q9_S1_hf_20260816_174906_aa662b53-4419-4708-a3c8-908441a9ae61.png';

    await page.goto('https://www.reddit.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.goto('https://www.reddit.com/r/HistoricalCostuming/submit?type=IMAGE', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    // Let's inspect the entire DOM of the dropzone area
    const dropzoneHtml = await page.evaluate(() => {
        const drop = document.querySelector('shreddit-media-input, [data-testid*="dropzone"], [data-testid*="media"], [class*="dropzone"]');
        return {
            tag: drop?.tagName,
            html: drop?.outerHTML?.slice(0, 500)
        };
    });
    console.log('Dropzone HTML:', dropzoneHtml);

    // Let's use Playwright's setInputFiles directly on the input inside shadow root or page
    const fileInput = page.locator('input[accept*="image"]').first();
    console.log('Is input attached:', await fileInput.count());
    if (await fileInput.count() > 0) {
        await fileInput.setInputFiles(imagePath);
        console.log('Attached file directly to input[accept*="image"]');
        await page.waitForTimeout(5000);
    }

    await page.screenshot({ path: path.join(__dirname, '../../config/reddit_dropzone_direct_test.png') });
    console.log('Saved screenshot!');
    await browser.close();
}

inspectDropzone().catch(console.error);

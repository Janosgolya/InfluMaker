const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function testFileDrop() {
    const browser = await chromium.launch({
        headless: true,
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
    });
    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    const imagePath = 'D:\\AntigravityProjects\\InfluMaker\\BettyRyal_18centuryServant\\Selected_Content\\PREP\\PREP_SFW_Q9_S1_hf_20260816_174906_aa662b53-4419-4708-a3c8-908441a9ae61.png';

    console.log('1. Warming session...');
    await page.goto('https://www.reddit.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    console.log('2. Navigating to submit page...');
    await page.goto('https://www.reddit.com/r/HistoricalCostuming/submit?type=IMAGE', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    // Read file buffer as base64
    const buffer = fs.readFileSync(imagePath);
    const base64Data = buffer.toString('base64');
    const fileName = path.basename(imagePath);
    const mimeType = 'image/png';

    console.log('3. Injecting file drop directly via DataTransfer event...');
    await page.evaluate(({ base64, name, mime }) => {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const file = new File([byteArray], name, { type: mime });

        const dt = new DataTransfer();
        dt.items.add(file);

        // Find dropzone element
        const dropzone = document.querySelector('shreddit-media-input, [data-testid*="dropzone"], [class*="dropzone"]') ||
                         document.querySelector('div[tabindex="0"]') ||
                         document.body;

        const dropEvent = new DragEvent('drop', {
            bubbles: true,
            cancelable: true,
            dataTransfer: dt
        });

        dropzone.dispatchEvent(dropEvent);

        // Also trigger on all file inputs
        const fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach(input => {
            input.files = dt.files;
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
    }, { base64: base64Data, name: fileName, mime: mimeType });

    console.log('4. Waiting 6s for dropped image to process...');
    await page.waitForTimeout(6000);

    await page.screenshot({ path: path.join(__dirname, '../../config/reddit_drag_drop_test.png') });
    console.log('Saved screenshot!');

    await browser.close();
}

testFileDrop().catch(console.error);

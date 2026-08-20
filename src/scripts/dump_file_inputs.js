const { chromium } = require('playwright');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function dumpInputs() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: SESSION_PATH, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    await page.goto('https://www.reddit.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.goto('https://www.reddit.com/r/HistoricalCostuming/submit?type=IMAGE', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    const fileInputs = page.locator('input[type="file"]');
    const count = await fileInputs.count();
    console.log(`Total input[type="file"]: ${count}`);

    for (let i = 0; i < count; i++) {
        const html = await fileInputs.nth(i).evaluate(el => ({
            outerHTML: el.outerHTML,
            accept: el.accept,
            name: el.name,
            id: el.id
        }));
        console.log(`Input #${i}:`, JSON.stringify(html, null, 2));
    }

    await browser.close();
}

dumpInputs().catch(console.error);

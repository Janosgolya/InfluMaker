const { chromium } = require('playwright');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function dumpInputsAfterTab() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: SESSION_PATH, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    await page.goto('https://www.reddit.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.goto('https://www.reddit.com/r/HistoricalCostuming/submit', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    console.log('Clicking Obrazy i filmy tab...');
    const tab = page.locator('button[role="tab"]').filter({ hasText: /Obrazy i filmy|Images & Video|Zdjęcia/i }).first();
    await tab.click();
    await page.waitForTimeout(3000);

    const fileInputs = page.locator('input[type="file"]');
    const count = await fileInputs.count();
    console.log(`Total input[type="file"] after clicking tab: ${count}`);

    for (let i = 0; i < count; i++) {
        const info = await fileInputs.nth(i).evaluate(el => ({
            outerHTML: el.outerHTML,
            accept: el.accept,
            name: el.name,
            id: el.id
        }));
        console.log(`Input #${i}:`, JSON.stringify(info, null, 2));
    }

    await browser.close();
}

dumpInputsAfterTab().catch(console.error);

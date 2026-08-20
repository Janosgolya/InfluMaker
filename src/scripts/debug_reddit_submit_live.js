const { chromium } = require('playwright');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function debugReddit() {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    console.log('Navigating to reddit home...');
    await page.goto('https://www.reddit.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    // Accept cookies
    try {
        const cBtn = page.locator('button:has-text("Zaakceptuj wszystkie")').first();
        if (await cBtn.isVisible({ timeout: 2000 })) await cBtn.click();
    } catch {}

    // Click "Utwórz" (Create button in top bar)
    console.log('Clicking Create button in top header...');
    const createBtn = page.locator('a[href*="/submit"], button:has-text("Utwórz"), a:has-text("Utwórz")').first();
    if (await createBtn.isVisible({ timeout: 4000 })) {
        await createBtn.click();
        await page.waitForTimeout(4000);
    } else {
        await page.goto('https://www.reddit.com/submit', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);
    }

    console.log('Current URL on Submit Page:', page.url());
    await page.screenshot({ path: path.join(__dirname, '../../config/reddit_create_page_inspect.png') });

    await browser.close();
}

debugReddit().catch(console.error);

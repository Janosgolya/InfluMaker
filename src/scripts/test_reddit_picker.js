const { chromium } = require('playwright');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function testPicker() {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
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

    console.log('Navigating to submit...');
    await page.goto('https://www.reddit.com/submit', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    // Click community selector via coordinate/locator
    const picker = page.locator('shreddit-community-picker, [name="community"], button[aria-label*="społeczność" i]').first();
    console.log('Picker found:', await picker.count());
    
    // Evaluate click directly
    await page.evaluate(() => {
        const el = document.querySelector('shreddit-community-picker') || document.querySelector('[name="community"]');
        if (el) {
            el.click();
            const btn = el.shadowRoot ? el.shadowRoot.querySelector('button') : null;
            if (btn) btn.click();
        }
    });
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(__dirname, '../../config/reddit_picker_open.png') });
    console.log('Saved picker screenshot!');

    await browser.close();
}

testPicker().catch(console.error);

const { chromium } = require('playwright');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function testFlair() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    await page.goto('https://www.reddit.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.goto('https://www.reddit.com/r/HistoricalCostuming/submit?type=IMAGE', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    console.log('Clicking "Dodaj wyróżnik i tagi"...');
    const flairBtn = page.locator('button:has-text("Dodaj wyróżnik"), button:has-text("Flair"), [data-testid*="flair"], button:has-text("tagi")').first();
    if (await flairBtn.isVisible({ timeout: 5000 })) {
        await flairBtn.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(__dirname, '../../config/reddit_flair_modal.png') });
        console.log('Saved flair modal screenshot!');

        const flairs = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('div[role="dialog"] li, div[role="dialog"] button, [data-testid*="flair"], div[role="dialog"] label')).map(el => el.innerText.trim()).filter(Boolean);
        });
        console.log('Found Flairs:', flairs);
    } else {
        console.log('Flair button not found!');
    }

    await browser.close();
}

testFlair().catch(console.error);

const { chromium } = require('playwright');

async function checkTikTok() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: 'config/tiktok_session.json', viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    try {
        await page.goto('https://www.tiktok.com/@bettyryal', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);
        await page.screenshot({ path: 'config/tiktok_profile_live_check.png' });
        
        const count = await page.evaluate(() => {
            return document.querySelectorAll('div[data-e2e="user-post-item"]').length;
        });
        console.log('Total live videos on TikTok:', count);
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await browser.close();
    }
}

checkTikTok();

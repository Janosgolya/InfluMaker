const { chromium } = require('playwright');
const path = require('path');

async function checkInstagramGrid() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: 'config/instagram_session.json', viewport: { width: 1440, height: 1200 } });
    const page = await context.newPage();

    try {
        await page.goto('https://www.instagram.com/secretsofthelondonmansion/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);

        const postsCount = await page.evaluate(() => {
            return document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]').length;
        });

        console.log(`Live posts count on Instagram grid: ${postsCount}`);
        await page.screenshot({ path: 'config/instagram_full_seeded_grid.png', fullPage: true });

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await browser.close();
    }
}

checkInstagramGrid();

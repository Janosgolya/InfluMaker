const { chromium } = require('playwright');

async function checkTikTokStudio() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: 'config/tiktok_session.json', viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    try {
        await page.goto('https://www.tiktok.com/tiktokstudio/content', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'config/tiktok_studio_live_list.png' });

        const rows = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('div[class*="content-table"] tr, div[class*="table-row"], div[class*="row"]'));
            return items.map(r => r.innerText.replace(/\n+/g, ' | ')).slice(0, 10);
        });

        console.log('TikTok Studio Rows:', rows);
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await browser.close();
    }
}

checkTikTokStudio();

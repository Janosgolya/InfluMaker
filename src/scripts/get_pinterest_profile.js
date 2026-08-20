const { chromium } = require('playwright');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/pinterest_session.json');

async function getProfileUrl() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: SESSION_PATH });
    const page = await context.newPage();

    await page.goto('https://www.pinterest.com/');
    await page.waitForTimeout(4000);

    const profileHandle = await page.evaluate(() => {
        const link = document.querySelector('a[href*="/_saved"], a[href*="/_created"], div[data-test-id="header-profile"] a, a[data-test-id="header-profile"]');
        return link ? link.getAttribute('href') : null;
    });

    console.log('Profile Link:', profileHandle);

    if (profileHandle) {
        const fullUrl = `https://www.pinterest.com${profileHandle}`;
        await page.goto(fullUrl);
        await page.waitForTimeout(4000);
        await page.screenshot({ path: path.join(__dirname, '../../config/pinterest_profile_direct.png') });
        console.log('Captured profile direct screenshot!');
    }

    await browser.close();
}

getProfileUrl().catch(console.error);

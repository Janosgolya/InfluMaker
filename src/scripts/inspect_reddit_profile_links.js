const { chromium } = require('playwright');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function inspectRedditProfile() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    console.log('Navigating to reddit home...');
    await page.goto('https://www.reddit.com/');
    await page.waitForTimeout(4000);

    // Accept cookies
    try {
        const cBtn = page.locator('button:has-text("Zaakceptuj wszystkie")').first();
        if (await cBtn.isVisible({ timeout: 2000 })) await cBtn.click();
    } catch {}

    // Find all links in left sidebar
    const sidebarLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href*="/r/"], a[href*="/user/"], a[href*="/u/"]')).map(a => ({
            text: a.innerText.trim(),
            href: a.getAttribute('href')
        }));
    });
    console.log('Sidebar Links:', sidebarLinks);

    // Click on top right avatar to see actual profile URL
    const avatar = page.locator('img[alt*="avatar" i], button[aria-label*="użytkownika" i]').first();
    if (await avatar.isVisible()) {
        await avatar.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(__dirname, '../../config/reddit_avatar_dropdown.png') });
        console.log('Avatar clicked!');
    }

    await browser.close();
}

inspectRedditProfile().catch(console.error);

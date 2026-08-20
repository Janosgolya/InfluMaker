const { chromium } = require('playwright');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function getRedditUsername() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: SESSION_PATH });
    const page = await context.newPage();

    await page.goto('https://www.reddit.com/');
    await page.waitForTimeout(4000);

    const userInfo = await page.evaluate(() => {
        const avatarBtn = document.querySelector('button[id*="USER_DROPDOWN"], button[aria-label*="użytkownika" i], button[aria-label*="user" i], [data-testid*="user-dropdown"]');
        const userLink = document.querySelector('a[href*="/user/"]');
        return {
            avatar: avatarBtn ? avatarBtn.getAttribute('aria-label') : null,
            userLink: userLink ? userLink.getAttribute('href') : null,
            html: document.querySelector('header, nav')?.innerText || ''
        };
    });

    console.log('User Info:', userInfo);

    // Let's click avatar and see dropdown
    const avatar = page.locator('button:has(img[alt*="avatar" i]), [aria-label*="użytkownika" i], button[id*="USER_DROPDOWN"], img[alt*="avatar" i]').first();
    if (await avatar.isVisible()) {
        await avatar.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(__dirname, '../../config/reddit_user_menu.png') });
        console.log('Captured user menu screenshot!');
    }

    await browser.close();
}

getRedditUsername().catch(console.error);

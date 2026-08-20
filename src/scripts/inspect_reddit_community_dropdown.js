const { chromium } = require('playwright');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function inspectCommunityDropdown() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: SESSION_PATH });
    const page = await context.newPage();

    await page.goto('https://www.reddit.com/submit');
    await page.waitForTimeout(4000);

    const commBtn = page.locator('button:has-text("Wybierz społeczność"), button[data-testid*="community"]').first();
    await commBtn.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(__dirname, '../../config/reddit_community_dropdown.png') });

    const options = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('div[role="option"], li, button, [role="menuitem"]')).map(el => el.innerText.trim()).filter(Boolean);
    });

    console.log('Community Options:', options);
    await browser.close();
}

inspectCommunityDropdown().catch(console.error);

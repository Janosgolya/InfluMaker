const { chromium } = require('playwright');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function checkBettyProfile() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    console.log('Navigating to user profile: https://www.reddit.com/user/BettyRyal/ ...');
    await page.goto('https://www.reddit.com/user/BettyRyal/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    const screenshotPath = path.join(__dirname, '../../config/reddit_betty_real_profile.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot: ${screenshotPath}`);

    const posts = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('shreddit-post, article, h3, a[href*="/comments/"]')).map(el => el.innerText.trim()).filter(Boolean);
    });
    console.log('Found Posts/Headings:', posts);

    await browser.close();
}

checkBettyProfile().catch(console.error);

const { chromium } = require('playwright');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/twitter_session.json');

async function snapshotTweet() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1440, height: 1200 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    try {
        await page.goto('https://x.com/SecretsOfBetty', { waitUntil: 'domcontentloaded', timeout: 25000 });
        await page.waitForTimeout(4000);
        await page.evaluate(() => window.scrollBy(0, 500));
        await page.waitForTimeout(2000);

        const screenshotPath = path.join(__dirname, '../../config/twitter_tweet_live.png');
        await page.screenshot({ path: screenshotPath });
        console.log(`📸 Tweet screenshot saved to: ${screenshotPath}`);
    } finally {
        await browser.close();
    }
}

snapshotTweet().catch(console.error);

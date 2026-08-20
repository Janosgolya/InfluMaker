const { chromium } = require('playwright');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function testDirectSubSubmit() {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    // 1. Go to Reddit home first so session cookies attach cleanly
    console.log('Navigating to home...');
    await page.goto('https://www.reddit.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // 2. Navigate directly to r/HistoricalCostuming submit page with type=IMAGE
    console.log('Navigating to r/HistoricalCostuming submit...');
    await page.goto('https://www.reddit.com/r/HistoricalCostuming/submit?type=IMAGE', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    await page.screenshot({ path: path.join(__dirname, '../../config/reddit_direct_sub_submit.png') });
    console.log('Saved screenshot!');

    const pageState = await page.evaluate(() => {
        const title = document.querySelector('h1, h2')?.innerText || '';
        const btns = Array.from(document.querySelectorAll('button')).map(b => ({
            text: b.innerText.trim(),
            disabled: b.disabled
        }));
        return { url: window.location.href, title, btns: btns.filter(b => b.text) };
    });

    console.log('Page State:', JSON.stringify(pageState, null, 2));
    await browser.close();
}

testDirectSubSubmit().catch(console.error);

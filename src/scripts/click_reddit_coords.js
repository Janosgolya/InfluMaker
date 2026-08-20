const { chromium } = require('playwright');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function testCoordClick() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    await page.goto('https://www.reddit.com/submit');
    await page.waitForTimeout(4000);

    const elInfo = await page.evaluate(() => {
        const el = document.elementFromPoint(295, 160);
        return {
            tag: el ? el.tagName : null,
            className: el ? el.className : null,
            outerHTML: el ? el.outerHTML.slice(0, 300) : null
        };
    });
    console.log('Element at (295, 160):', elInfo);

    // Click at (295, 160)
    await page.mouse.click(295, 160);
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(__dirname, '../../config/reddit_after_coord_click.png') });
    console.log('Saved coord click screenshot!');

    await browser.close();
}

testCoordClick().catch(console.error);

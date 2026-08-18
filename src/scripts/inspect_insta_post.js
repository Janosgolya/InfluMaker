const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/instagram_session.json');

async function inspectPostDetails() {
    const browser = await chromium.launch({
        headless: true,
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox']
    });
    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1440, height: 900 }
    });
    const page = await context.newPage();

    try {
        const url = 'https://www.instagram.com/secretsofthelondonmansion/p/DcLaD3cCMUR/';
        console.log(`Opening: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(4000);

        const details = await page.evaluate(() => {
            const h1 = document.querySelector('h1');
            const h1Text = h1 ? h1.innerText : 'NO H1';
            const allSpans = Array.from(document.querySelectorAll('article span, main span')).map(s => s.innerText.trim()).filter(t => t.length > 5);
            return {
                h1Text,
                allSpansCount: allSpans.length,
                allSpansSample: allSpans.slice(0, 10)
            };
        });

        console.log('Post details:', JSON.stringify(details, null, 2));

        // Take a screenshot of the post
        const scPath = path.join(__dirname, '../../config/insta_post_inspect.png');
        await page.screenshot({ path: scPath, fullPage: true });
        console.log(`Screenshot saved to ${scPath}`);
    } finally {
        await browser.close();
    }
}

inspectPostDetails().catch(console.error);

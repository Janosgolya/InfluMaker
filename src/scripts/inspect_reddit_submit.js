const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function inspectRedditSubmit() {
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
        await page.goto('https://www.reddit.com/r/aiArt/submit', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(4000);

        const buttons = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, shreddit-post-form-submit-button, [role="button"]'));
            return btns.map(b => ({
                tag: b.tagName,
                text: (b.innerText || '').trim(),
                type: b.getAttribute('type'),
                slot: b.getAttribute('slot'),
                disabled: b.hasAttribute('disabled') || b.getAttribute('aria-disabled') === 'true',
                id: b.id,
                className: b.className
            })).filter(b => b.text || b.slot || b.id);
        });

        console.log('Buttons found on Reddit submit page:');
        console.log(JSON.stringify(buttons, null, 2));

        // Save screenshot of submit page
        await page.screenshot({ path: path.join(__dirname, '../../config/reddit_submit_dom.png') });
    } finally {
        await browser.close();
    }
}

inspectRedditSubmit().catch(console.error);

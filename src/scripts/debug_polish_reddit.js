const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function debugPolishReddit() {
    const browser = await chromium.launch({
        headless: true,
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    try {
        await page.goto('https://www.reddit.com/r/aiArt/submit/?type=IMAGE', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(5000);

        const clickableElements = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('button, input, [role="button"], [slot="submit-button"], faceplate-tracker'));
            return elements.map(e => ({
                tag: e.tagName,
                text: (e.innerText || e.textContent || '').trim().replace(/\s+/g, ' '),
                type: e.getAttribute('type'),
                slot: e.getAttribute('slot'),
                id: e.id,
                name: e.getAttribute('name')
            })).filter(e => e.text.length > 0 && e.text.length < 50);
        });

        console.log('Clickable elements:', JSON.stringify(clickableElements, null, 2));
    } finally {
        await browser.close();
    }
}

debugPolishReddit().catch(console.error);

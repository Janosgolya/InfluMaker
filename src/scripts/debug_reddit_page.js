const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function debugPage() {
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
        await page.goto('https://www.reddit.com/r/aiArt/submit', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(6000);

        console.log('URL:', page.url());
        console.log('Title:', await page.title());

        // Find submit button in DOM
        const submitBtnInfo = await page.evaluate(() => {
            const allElements = Array.from(document.querySelectorAll('*'));
            const matches = allElements.filter(el => {
                const text = el.innerText ? el.innerText.trim() : '';
                return text === 'Post' || text === 'Opublikuj' || text === 'Submit';
            });
            return matches.map(el => ({
                tag: el.tagName,
                className: el.className,
                type: el.getAttribute('type'),
                parentTag: el.parentElement ? el.parentElement.tagName : null,
                role: el.getAttribute('role')
            }));
        });

        console.log('Post buttons found in DOM:', JSON.stringify(submitBtnInfo, null, 2));
    } finally {
        await browser.close();
    }
}

debugPage().catch(console.error);

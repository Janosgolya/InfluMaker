const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/instagram_session.json');

async function dumpPostButtons() {
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
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(4000);

        const buttons = await page.evaluate(() => {
            const all = Array.from(document.querySelectorAll('button, div[role="button"], svg'));
            return all.map(el => ({
                tag: el.tagName,
                role: el.getAttribute('role'),
                ariaLabel: el.getAttribute('aria-label'),
                className: el.className,
                innerText: el.innerText ? el.innerText.trim() : '',
                parentTag: el.parentElement ? el.parentElement.tagName : ''
            })).filter(b => b.ariaLabel || b.role === 'button' || b.tag === 'BUTTON');
        });

        console.log('Found interactive elements:', JSON.stringify(buttons, null, 2));
    } finally {
        await browser.close();
    }
}

dumpPostButtons().catch(console.error);

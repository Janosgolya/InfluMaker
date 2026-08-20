const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/pinterest_session.json');

async function inspectPinterest() {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({ storageState: SESSION_PATH, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    await page.goto('https://www.pinterest.com/pin-creation-tool/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);

    const data = await page.evaluate(() => {
        // Collect all buttons, inputs, draft items
        const drafts = Array.from(document.querySelectorAll('[data-test-id*="draft"], [role="listitem"], div[class*="draft"], [data-test-id*="pin-draft"]')).map(el => ({
            tag: el.tagName,
            id: el.id,
            testId: el.getAttribute('data-test-id'),
            role: el.getAttribute('role'),
            text: el.innerText.slice(0, 80),
            className: el.className
        }));

        const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
            text: b.innerText.trim(),
            testId: b.getAttribute('data-test-id'),
            ariaLabel: b.getAttribute('aria-label'),
            disabled: b.disabled,
            className: b.className
        }));

        return { url: window.location.href, drafts, buttons };
    });

    console.log('DOM Inspection Data:', JSON.stringify(data, null, 2));
    await page.screenshot({ path: path.join(__dirname, '../../config/pinterest_dom_inspect.png') });
    await browser.close();
}

inspectPinterest().catch(console.error);

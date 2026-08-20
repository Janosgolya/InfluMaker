const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/pinterest_session.json');

async function testPublish() {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({ storageState: SESSION_PATH, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    console.log('Navigating to pin creation tool...');
    await page.goto('https://www.pinterest.com/pin-creation-tool/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    console.log('Locating first draft item...');
    const firstDraft = page.locator('[data-test-id="pin-draft-content-container"]').first();
    await firstDraft.click();
    console.log('Clicked first draft!');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: path.join(__dirname, '../../config/pinterest_draft_clicked.png') });

    // Inspect board elements on active draft
    const boardState = await page.evaluate(() => {
        const boardEls = Array.from(document.querySelectorAll('*')).filter(el => {
            const t = el.innerText || '';
            const testId = el.getAttribute('data-test-id') || '';
            return testId.includes('board') || t.includes('Choose a board') || t.includes('Wybierz tablicę');
        }).map(el => ({
            tag: el.tagName,
            testId: el.getAttribute('data-test-id'),
            role: el.getAttribute('role'),
            text: (el.innerText || '').slice(0, 50),
            className: el.className
        }));

        const publishBtn = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('Publish') || b.innerText.includes('Save') || b.innerText.includes('Opublikuj')).map(b => ({
            text: b.innerText,
            testId: b.getAttribute('data-test-id'),
            disabled: b.disabled
        }));

        return { boardEls: boardEls.slice(0, 10), publishBtn };
    });

    console.log('Board State:', JSON.stringify(boardState, null, 2));
    await browser.close();
}

testPublish().catch(console.error);

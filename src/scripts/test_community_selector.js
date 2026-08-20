const { chromium } = require('playwright');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function testSelector() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: SESSION_PATH, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    await page.goto('https://www.reddit.com/submit');
    await page.waitForTimeout(4000);

    const commSelector = page.locator('text="Wybierz społeczność"').first();
    console.log('Is visible:', await commSelector.isVisible());
    await commSelector.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(__dirname, '../../config/reddit_dropdown_open.png') });
    console.log('Screenshot saved!');

    const items = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('*')).filter(el => {
            const t = el.innerText || '';
            return t.includes('Profil') || t.includes('u/') || t.includes('HistoricalCostuming') || t.includes('aiArt');
        }).map(el => ({ tag: el.tagName, text: (el.innerText || '').slice(0, 40) })).slice(0, 15);
    });

    console.log('Items:', items);
    await browser.close();
}

testSelector().catch(console.error);

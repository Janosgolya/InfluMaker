const { chromium } = require('playwright');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function inspectFileInputs() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: SESSION_PATH });
    const page = await context.newPage();

    await page.goto('https://www.reddit.com/r/HistoricalCostuming/submit?type=IMAGE');
    await page.waitForTimeout(4000);

    const inputDetails = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('input[type="file"]')).map((el, idx) => ({
            index: idx,
            accept: el.getAttribute('accept'),
            name: el.getAttribute('name'),
            id: el.id,
            parentTag: el.parentElement?.tagName,
            parentClass: el.parentElement?.className,
            outerHTML: el.outerHTML
        }));
    });

    console.log('File Input Details:', JSON.stringify(inputDetails, null, 2));
    await browser.close();
}

inspectFileInputs().catch(console.error);

const { chromium } = require('playwright');

async function checkSummary() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        await page.goto('https://github.com/Janosgolya/InfluMaker/actions/runs/32145600095', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(5000);

        const bodyText = await page.evaluate(() => document.body.innerText);
        console.log('Body Text:');
        console.log(bodyText);
    } finally {
        await browser.close();
    }
}

checkSummary().catch(console.error);

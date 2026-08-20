const { chromium } = require('playwright');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function testSubreddit(sub) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: SESSION_PATH, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    console.log(`Checking r/${sub}/submit ...`);
    await page.goto(`https://www.reddit.com/r/${sub}/submit`);
    await page.waitForTimeout(4000);

    const rules = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const postBtn = btns.find(b => b.innerText.includes('Post') || b.innerText.includes('Postuj'));
        return {
            url: window.location.href,
            heading: document.querySelector('h1, h2')?.innerText || '',
            submitDisabled: postBtn ? postBtn.disabled : null
        };
    });

    console.log(`r/${sub} state:`, rules);
    await page.screenshot({ path: path.join(__dirname, `../../config/reddit_sub_${sub}.png`) });
    await browser.close();
}

(async () => {
    await testSubreddit('HistoricalCostuming');
    await testSubreddit('aiArt');
    await testSubreddit('Replika');
})();

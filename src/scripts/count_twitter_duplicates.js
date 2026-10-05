const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const sessionPath = path.resolve(__dirname, '../../config/twitter_session.json');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        storageState: sessionPath,
        viewport: { width: 1440, height: 1200 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    try {
        await page.goto('https://x.com/SecretsOfBetty', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(4000);

        let duplicatesFound = [];

        // Scroll down several times to collect tweets
        for (let scroll = 0; scroll < 6; scroll++) {
            const articles = await page.$$('article');
            for (const article of articles) {
                const text = await article.innerText().catch(() => '');
                const hasVideo = (await article.$('video')) !== null;
                const timeEl = await article.$('time');
                const time = timeEl ? await timeEl.getAttribute('datetime') : '';
                
                if (text.includes('[A punchy, breathless') || (hasVideo && text.includes('SecretsOfBetty'))) {
                    // Check if already in list by time or text
                    if (!duplicatesFound.some(d => d.time === time && d.time !== '')) {
                        duplicatesFound.push({
                            time,
                            textSnippet: text.slice(0, 100).replace(/\n/g, ' '),
                            hasVideo
                        });
                    }
                }
            }
            await page.evaluate(() => window.scrollBy(0, 1000));
            await page.waitForTimeout(2000);
        }

        console.log(`Found ${duplicatesFound.length} duplicate/buggy video tweets:`);
        duplicatesFound.forEach((d, i) => console.log(`${i + 1}. [${d.time}] ${d.textSnippet}`));

    } catch (e) {
        console.error(e.message);
    } finally {
        await browser.close();
    }
})();

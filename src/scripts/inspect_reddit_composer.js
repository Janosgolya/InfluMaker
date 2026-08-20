const { chromium } = require('playwright');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function inspectComposer() {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({ storageState: SESSION_PATH, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    console.log('Navigating to user profile submit: https://www.reddit.com/user/SecretsOfBetty/submit ...');
    await page.goto('https://www.reddit.com/user/SecretsOfBetty/submit', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    const userProfileUrl = page.url();
    console.log('User Submit URL:', userProfileUrl);
    await page.screenshot({ path: path.join(__dirname, '../../config/reddit_user_submit_inspect.png') });

    console.log('Navigating to r/aiArt submit...');
    await page.goto('https://www.reddit.com/r/aiArt/submit', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    const elements = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('input, textarea, div[contenteditable="true"], button, [data-testid]')).map(el => ({
            tag: el.tagName,
            testId: el.getAttribute('data-testid') || el.getAttribute('name'),
            placeholder: el.getAttribute('placeholder'),
            text: (el.innerText || '').slice(0, 40),
            disabled: el.disabled || el.getAttribute('disabled')
        })).filter(e => e.testId || e.placeholder || e.text);
    });

    console.log('Found Elements:', JSON.stringify(elements.slice(0, 30), null, 2));
    await browser.close();
}

inspectComposer().catch(console.error);

const { chromium } = require('playwright');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/pinterest_session.json');

async function checkSavedPins() {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({ storageState: SESSION_PATH, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    console.log('Navigating to saved boards...');
    await page.goto('https://www.pinterest.com/SecretsofLondonMansion/_saved/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    const screenshotPath = path.join(__dirname, '../../config/pinterest_saved_boards_live.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`📸 Saved boards screenshot: ${screenshotPath}`);

    const boardNames = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[data-test-id*="board"], h2, div[title]')).map(el => el.innerText.trim()).filter(Boolean);
    });
    console.log('Found Boards/Elements:', boardNames);

    await browser.close();
}

checkSavedPins().catch(console.error);

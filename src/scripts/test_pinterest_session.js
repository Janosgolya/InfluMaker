const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/pinterest_session.json');

async function testSession() {
    console.log('======================================================');
    console.log('🔍 VERIFYING PINTEREST SESSION...');
    console.log('======================================================\n');

    if (!fs.existsSync(SESSION_PATH)) {
        console.error('❌ Session file not found!');
        return;
    }

    const browser = await chromium.launch({
        headless: true,
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    try {
        console.log('🌐 Loading Pinterest Home / Feed...');
        await page.goto('https://www.pinterest.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(4000);

        const currentUrl = page.url();
        console.log(`Current URL: ${currentUrl}`);

        const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('/signup');
        if (isLoginPage) {
            console.log('❌ Session is NOT fully logged in (redirected to login/signup).');
            return false;
        }

        console.log('🌐 Testing Pin Creation Tool access...');
        await page.goto('https://www.pinterest.com/pin-creation-tool/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(4000);

        const pinUrl = page.url();
        console.log(`Pin Creation URL: ${pinUrl}`);

        if (pinUrl.includes('/pin-creation-tool') || pinUrl.includes('/pin-builder')) {
            console.log('🎉 PINTEREST SESSION IS 100% VALID AND AUTHORIZED FOR PIN CREATION!');
            return true;
        } else {
            console.log('⚠️ Pin creation tool redirected to:', pinUrl);
            return false;
        }
    } catch (e) {
        console.error('❌ Error testing session:', e.message);
        return false;
    } finally {
        await browser.close();
    }
}

testSession().catch(console.error);

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function testRedditSession() {
    console.log('======================================================');
    console.log('🔍 VERIFYING REDDIT SESSION...');
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
        console.log('🌐 Loading Reddit Home...');
        await page.goto('https://www.reddit.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(4000);

        const currentUrl = page.url();
        console.log(`Current URL: ${currentUrl}`);

        const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('/register');
        if (isLoginPage) {
            console.log('❌ Session is NOT logged in.');
            return false;
        }

        console.log('🌐 Loading Reddit Submit Page...');
        await page.goto('https://www.reddit.com/submit', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(4000);

        const submitUrl = page.url();
        console.log(`Submit URL: ${submitUrl}`);

        if (submitUrl.includes('/submit')) {
            console.log('🎉 REDDIT SESSION IS 100% VALID AND AUTHORIZED FOR SUBMISSION!');
            return true;
        } else {
            console.log('⚠️ Redirected to:', submitUrl);
            return false;
        }
    } catch (e) {
        console.error('❌ Error testing Reddit session:', e.message);
        return false;
    } finally {
        await browser.close();
    }
}

testRedditSession().catch(console.error);

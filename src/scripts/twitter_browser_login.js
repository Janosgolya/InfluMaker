const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/twitter_session.json');

async function loginAndSaveSession() {
    console.log('======================================================');
    console.log('🐦 X (TWITTER) SESSION LOGIN GENERATOR');
    console.log('======================================================\n');
    console.log('1. A Chrome browser window will open shortly.');
    console.log('2. Please log in to your X/Twitter account for Betty Ryal.');
    console.log('3. Once you are logged in, the session will be automatically saved.');
    console.log('4. You can also close the browser when done.\n');

    const browser = await chromium.launch({
        headless: false,
        args: ['--start-maximized', '--disable-blink-features=AutomationControlled']
    });

    const context = await browser.newContext({
        viewport: null,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    try {
        await page.goto('https://x.com/i/flow/login', { waitUntil: 'domcontentloaded' });
        console.log('⏳ Waiting for you to complete login in the browser window...');

        let loggedIn = false;
        const maxWaitTime = 1000 * 60 * 10; // 10 minutes
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitTime) {
            await page.waitForTimeout(3000);
            const currentUrl = page.url();

            if (!currentUrl.includes('/login') && !currentUrl.includes('/flow/')) {
                const state = await context.storageState();
                const hasTwitterSession = state.cookies.some(c => c.name === 'auth_token' || c.name === 'ct0' || c.domain.includes('x.com') || c.domain.includes('twitter.com'));

                if (hasTwitterSession) {
                    loggedIn = true;
                    console.log(`\n🎉 Logged in detected at: ${currentUrl}`);
                    fs.writeFileSync(SESSION_PATH, JSON.stringify(state, null, 2), 'utf8');
                    console.log(`✅ X/Twitter session state successfully saved to:\n   ${SESSION_PATH}`);
                    break;
                }
            }
        }
    } catch (e) {
        if (!e.message.includes('Target page, context or browser has been closed')) {
            console.error('Error during Twitter login:', e.message);
        }
    } finally {
        await browser.close().catch(() => {});
    }
}

loginAndSaveSession().catch(console.error);

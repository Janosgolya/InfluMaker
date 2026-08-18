const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/pinterest_session.json');

async function loginAndSaveSession() {
    console.log('======================================================');
    console.log('📌 PINTEREST SESSION LOGIN GENERATOR');
    console.log('======================================================\n');
    console.log('1. A Chrome browser window will open shortly.');
    console.log('2. Please log in to your Pinterest account for Betty Ryal.');
    console.log('3. Once you reach the Pinterest home feed or profile, the session will be automatically saved.');
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
        await page.goto('https://www.pinterest.com/login/', { waitUntil: 'domcontentloaded' });
        console.log('⏳ Waiting for you to complete login in the browser window...');

        // Wait until logged in: user navigates to feed / home / business hub / profile
        let loggedIn = false;
        const maxWaitTime = 1000 * 60 * 5; // 5 minutes
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitTime) {
            await page.waitForTimeout(3000);
            const currentUrl = page.url();

            // Check if user is past the login screen
            if (!currentUrl.includes('/login') && !currentUrl.includes('/signup')) {
                // Verify cookies or user avatar in DOM
                const state = await context.storageState();
                const hasSessionCookie = state.cookies.some(c => c.name === '_auth' || c.name === '_pinterest_sess' || c.domain.includes('pinterest.com'));

                if (hasSessionCookie && (currentUrl.includes('/today') || currentUrl.includes('pinterest.com/') || currentUrl.includes('/business/'))) {
                    loggedIn = true;
                    console.log(`\n🎉 Logged in detected at: ${currentUrl}`);
                    
                    // Save session state
                    fs.writeFileSync(SESSION_PATH, JSON.stringify(state, null, 2), 'utf8');
                    console.log(`✅ Session state successfully saved to:\n   ${SESSION_PATH}`);
                    console.log(`   Size: ${fs.statSync(SESSION_PATH).size} bytes`);
                    break;
                }
            }
        }

        if (!loggedIn) {
            console.log('⚠️ Login timeout reached or browser closed before completion.');
        } else {
            console.log('\n======================================================');
            console.log('🚀 PINTEREST SESSION CAPTURED & READY FOR 24/7 AUTO-PINS!');
            console.log('======================================================\n');
        }
    } catch (e) {
        if (e.message.includes('Target page, context or browser has been closed')) {
            console.log('ℹ️ Browser closed by user. Checking if session was saved...');
        } else {
            console.error('Error during Pinterest login:', e.message);
        }
    } finally {
        await browser.close().catch(() => {});
    }
}

loginAndSaveSession().catch(console.error);

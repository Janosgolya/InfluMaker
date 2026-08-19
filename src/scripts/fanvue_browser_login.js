const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/fanvue_session.json');

async function loginFanvueBrowser() {
    console.log('======================================================');
    console.log('🌐 FANVUE BROWSER LOGIN ASSISTANT');
    console.log('======================================================\n');
    console.log('Opening browser window. Please log into your Fanvue account (Betty Ryal).');
    console.log('Once logged in and seeing your profile/feed, return here or wait for auto-save.\n');

    const browser = await chromium.launch({
        headless: false,
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
    });

    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();
    await page.goto('https://fanvue.com/login', { waitUntil: 'domcontentloaded' });

    console.log('⏳ Waiting for user to complete login on Fanvue (up to 120s)...');

    let loggedIn = false;
    for (let i = 0; i < 60; i++) {
        await page.waitForTimeout(2000);
        const url = page.url();
        if (!url.includes('/login') && !url.includes('/register') && !url.includes('/auth')) {
            console.log(`🎉 Logged-in state detected! URL: ${url}`);
            loggedIn = true;
            break;
        }
    }

    if (loggedIn) {
        await page.waitForTimeout(3000);
        await context.storageState({ path: SESSION_PATH });
        console.log(`💾 Fanvue browser session successfully saved to: ${SESSION_PATH}`);
    } else {
        console.log('⚠️ Login window timed out or was closed.');
    }

    await browser.close();
}

if (require.main === module) {
    loginFanvueBrowser().catch(console.error);
}

module.exports = { loginFanvueBrowser };

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const SESSION_PATH = path.join(__dirname, '../../config/twitter_session.json');

async function loginAndSaveSession() {
    console.log('======================================================');
    console.log('🐦 X (TWITTER) SESSION LOGIN GENERATOR');
    console.log('======================================================\n');
    console.log('1. A Chrome browser window will open.');
    console.log('2. Log in to your X/Twitter account for Betty Ryal.');
    console.log('3. Once you see your X home timeline / profile:');
    console.log('   - The script will automatically detect auth_token.');
    console.log('   - OR you can press ENTER here in this console window!\n');

    const browser = await chromium.launch({
        headless: false,
        args: ['--start-maximized', '--disable-blink-features=AutomationControlled']
    });

    const context = await browser.newContext({
        viewport: null,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    // Setup interactive Enter key listener in console
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    let isSaved = false;

    async function saveCurrentSession(reason = 'Auto-detected') {
        if (isSaved) return;
        try {
            const state = await context.storageState();
            const hasAuthToken = state.cookies.some(c => c.name === 'auth_token');
            if (hasAuthToken || reason === 'Manual Enter') {
                isSaved = true;
                fs.writeFileSync(SESSION_PATH, JSON.stringify(state, null, 2), 'utf8');
                console.log(`\n🎉 (${reason}) X/Twitter session state successfully saved to:\n   ${SESSION_PATH}`);
                rl.close();
                await browser.close().catch(() => {});
            }
        } catch (e) {
            console.error('Error saving session:', e.message);
        }
    }

    rl.question('\n👉 When you are logged in on X, press ENTER here to confirm & save: ', async () => {
        await saveCurrentSession('Manual Enter');
        process.exit(0);
    });

    try {
        await page.goto('https://x.com/i/flow/login', { waitUntil: 'domcontentloaded' });
        console.log('⏳ Waiting for login on X (Twitter)...');

        const maxWaitTime = 1000 * 60 * 15; // 15 minutes
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitTime && !isSaved) {
            await page.waitForTimeout(3000);
            const currentUrl = page.url();

            const state = await context.storageState();
            const hasAuthToken = state.cookies.some(c => c.name === 'auth_token');

            if (hasAuthToken && (currentUrl.includes('/home') || currentUrl.includes('/notifications') || (!currentUrl.includes('/login') && !currentUrl.includes('/flow/')))) {
                await page.waitForTimeout(2000);
                await saveCurrentSession('Auth Token Detected');
                break;
            }
        }
    } catch (e) {
        if (!e.message.includes('Target page, context or browser has been closed')) {
            console.error('Error during Twitter login:', e.message);
        }
    } finally {
        if (!isSaved) {
            await saveCurrentSession('Browser Exit');
        }
        rl.close();
        await browser.close().catch(() => {});
    }
}

loginAndSaveSession().catch(console.error);

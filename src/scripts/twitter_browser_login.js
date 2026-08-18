const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const SESSION_PATH = path.join(__dirname, '../../config/twitter_session.json');

async function loginAndSaveSession() {
    console.log('======================================================');
    console.log('🐦 X (TWITTER) SESSION LOGIN GENERATOR');
    console.log('======================================================\n');
    console.log('1. A Chrome browser window is opening.');
    console.log('2. Log in to your X/Twitter account for Betty Ryal.');
    console.log('3. When you are logged in, simply press ENTER in this console');
    console.log('   (or the script will auto-save when you reach your home feed).\n');

    const browser = await chromium.launch({
        headless: false,
        args: [
            '--start-maximized',
            '--disable-blink-features=AutomationControlled',
            '--disable-features=IsolateOrigins,site-per-process'
        ]
    });

    const context = await browser.newContext({
        viewport: null,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });

    // Remove navigator.webdriver flag
    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
        });
    });

    const page = await context.newPage();

    let isSaved = false;

    async function saveCurrentSession(reason = 'Manual confirmation') {
        if (isSaved) return;
        try {
            const state = await context.storageState();
            fs.writeFileSync(SESSION_PATH, JSON.stringify(state, null, 2), 'utf8');
            console.log(`\n🎉 (${reason}) X/Twitter session state successfully saved to:\n   ${SESSION_PATH}`);
            isSaved = true;
        } catch (e) {
            console.error('Error saving session:', e.message);
        }
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('\n👉 When you finish logging in on X, press ENTER here: ', async () => {
        await saveCurrentSession('ENTER pressed');
        rl.close();
        await browser.close().catch(() => {});
        process.exit(0);
    });

    try {
        console.log('🌐 Opening https://x.com/login...');
        await page.goto('https://x.com/login', { waitUntil: 'domcontentloaded' });

        // Passive monitoring without reloading or interfering
        while (!isSaved) {
            await page.waitForTimeout(5000);
            try {
                const currentUrl = page.url();
                if (currentUrl.includes('/home') || currentUrl.includes('/explore') || currentUrl.includes('/notifications')) {
                    const state = await context.storageState();
                    const hasAuth = state.cookies.some(c => c.name === 'auth_token');
                    if (hasAuth) {
                        console.log(`\n🎉 Logged in detected at: ${currentUrl}`);
                        await saveCurrentSession('Auto-detected Home URL');
                        rl.close();
                        await browser.close().catch(() => {});
                        process.exit(0);
                    }
                }
            } catch (err) {
                // Browser might be closed by user
                break;
            }
        }
    } catch (e) {
        if (!e.message.includes('Target page, context or browser has been closed')) {
            console.error('Notice:', e.message);
        }
    } finally {
        if (!isSaved) {
            await saveCurrentSession('Browser closed');
        }
        rl.close();
        await browser.close().catch(() => {});
    }
}

loginAndSaveSession().catch(console.error);

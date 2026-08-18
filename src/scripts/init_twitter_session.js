const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/twitter_session.json');
const AUTH_TOKEN = 'b3a041ffd2e72163c93b3a7af816e115ad5eeb6f';

async function initTwitterSessionWithToken() {
    console.log('======================================================');
    console.log('🐦 INITIALIZING X (TWITTER) SESSION FROM AUTH TOKEN');
    console.log('======================================================\n');

    const browser = await chromium.launch({
        headless: true,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });

    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });

    // Set auth_token for both x.com and twitter.com
    await context.addCookies([
        {
            name: 'auth_token',
            value: AUTH_TOKEN,
            domain: '.x.com',
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'None',
            expires: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60)
        },
        {
            name: 'auth_token',
            value: AUTH_TOKEN,
            domain: '.twitter.com',
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'None',
            expires: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60)
        }
    ]);

    const page = await context.newPage();
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    try {
        console.log('🌐 Loading X / Twitter with auth token...');
        await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 35000 });
        await page.waitForTimeout(6000);

        const currentUrl = page.url();
        console.log(`Current URL: ${currentUrl}`);

        const title = await page.title();
        console.log(`Page Title: ${title}`);

        const bodySnippet = (await page.evaluate(() => document.body.innerText)).substring(0, 300).replace(/\n+/g, ' ');
        console.log(`Page Content Snippet: ${bodySnippet}`);

        await page.screenshot({ path: 'config/twitter_check.png' });
        console.log('📸 Screenshot saved to config/twitter_check.png');

        // Capture full storage state including new ct0 csrf token
        const fullState = await context.storageState();
        fs.writeFileSync(SESSION_PATH, JSON.stringify(fullState, null, 2), 'utf8');
        console.log(`✅ Full X / Twitter session saved to:\n   ${SESSION_PATH} (${JSON.stringify(fullState).length} bytes)`);

        if (currentUrl.includes('/home') || currentUrl.includes('/compose') || bodySnippet.includes('Post') || bodySnippet.includes('Wpisz coś')) {
            console.log('\n🎉 X / TWITTER SESSION IS 100% VALID AND AUTHENTICATED!');
            return true;
        } else {
            console.log('\nℹ️ Check screenshot to see account status.');
            return false;
        }
    } catch (e) {
        console.error('Error testing Twitter session:', e.message);
        return false;
    } finally {
        await browser.close();
    }
}

initTwitterSessionWithToken().catch(console.error);

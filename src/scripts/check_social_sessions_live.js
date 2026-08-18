const { chromium } = require('playwright');
const fs = require('fs');

async function testSessions() {
    const browser = await chromium.launch({ headless: true });
    
    console.log('======================================================');
    console.log('🔍 LIVE SESSION VERIFICATION ACROSS PLATFORMS');
    console.log('======================================================\n');

    // 1. Check Pinterest
    try {
        if (fs.existsSync('config/pinterest_session.json')) {
            const ctx = await browser.newContext({ storageState: 'config/pinterest_session.json' });
            const page = await ctx.newPage();
            await page.goto('https://www.pinterest.com/', { waitUntil: 'domcontentloaded', timeout: 25000 });
            await page.waitForTimeout(4000);
            const isLogged = !(await page.$('button:has-text("Log in"), button:has-text("Zaloguj się")'));
            console.log(`📌 Pinterest: ${isLogged ? '🟢 ZALOGOWANY (Aktywny)' : '🔴 WYLOGOWANY'}`);
            await ctx.close();
        } else {
            console.log('📌 Pinterest: ⚠️ Brak pliku sesji');
        }
    } catch (e) {
        console.log(`📌 Pinterest: Błąd sprawdzania (${e.message})`);
    }

    // 2. Check Reddit
    try {
        if (fs.existsSync('config/reddit_session.json')) {
            const ctx = await browser.newContext({ storageState: 'config/reddit_session.json' });
            const page = await ctx.newPage();
            await page.goto('https://www.reddit.com/', { waitUntil: 'domcontentloaded', timeout: 25000 });
            await page.waitForTimeout(4000);
            const isLogged = !(await page.$('a[href*="/login"], button:has-text("Log In"), button:has-text("Zaloguj się")'));
            console.log(`🤖 Reddit: ${isLogged ? '🟢 ZALOGOWANY (Aktywny)' : '🔴 WYLOGOWANY'}`);
            await ctx.close();
        } else {
            console.log('🤖 Reddit: ⚠️ Brak pliku sesji');
        }
    } catch (e) {
        console.log(`🤖 Reddit: Błąd sprawdzania (${e.message})`);
    }

    // 3. Check Twitter / X
    try {
        if (fs.existsSync('config/twitter_session.json')) {
            const ctx = await browser.newContext({
                storageState: 'config/twitter_session.json',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            });
            const page = await ctx.newPage();
            await page.addInitScript(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            });
            await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 25000 });
            await page.waitForTimeout(5000);
            const url = page.url();
            const body = await page.evaluate(() => document.body.innerText);
            const isSuspended = body.includes('suspended') || body.includes('zablokowane') || body.includes('ograniczyliśmy');
            const isLogged = url.includes('/home') || url.includes('/compose');
            
            if (isSuspended) {
                console.log(`🐦 X (Twitter): 🔴 KONTO OGRANICZONE / ZAWIESZONE PRZEZ TWITTER`);
            } else if (isLogged) {
                console.log(`🐦 X (Twitter): 🟢 ZALOGOWANY (Aktywny)`);
            } else {
                console.log(`🐦 X (Twitter): 🟡 Wymaga ponownego tokenu / weryfikacji (URL: ${url})`);
            }
            await ctx.close();
        } else {
            console.log('🐦 X (Twitter): ⚠️ Brak pliku sesji');
        }
    } catch (e) {
        console.log(`🐦 X (Twitter): Błąd sprawdzania (${e.message})`);
    }

    await browser.close();
}

testSessions().catch(console.error);

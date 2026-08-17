const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/tiktok_session.json');

async function loginTikTok() {
    console.log(`\n======================================================`);
    console.log(`🎬 INFLUMAKER: TikTok Browser Login`);
    console.log(`======================================================`);
    console.log(`Uruchamiam okno logowania TikToka...`);

    const browser = await chromium.launch({
        headless: false,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--start-maximized'
        ]
    });

    const context = await browser.newContext({
        viewport: null,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();
    console.log(`🌐 Otwieram https://www.tiktok.com/login ...`);
    await page.goto('https://www.tiktok.com/login', { waitUntil: 'domcontentloaded' });

    console.log(`\n👉 Zaloguj się w otwartym oknie na konto Betty Ryal.`);
    console.log(`Skrypt sam wykryje zalogowanie i zapisze sesję...\n`);

    const pollInterval = setInterval(async () => {
        try {
            const cookies = await context.cookies();
            const isLoggedIn = cookies.some(c => c.name === 'sessionid' || c.name === 'sid_tt' || c.name === 'sessionid_ss');
            const currentUrl = page.url();

            if (isLoggedIn || (!currentUrl.includes('/login') && !currentUrl.includes('/signup') && currentUrl.includes('tiktok.com'))) {
                clearInterval(pollInterval);
                console.log(`\n🎉 WYKRYTO ZALOGOWANIE! Zapisuję sesję do config/tiktok_session.json...`);

                await context.storageState({ path: SESSION_PATH });
                console.log(`💾 Sukces! Plik sesji zapisany.`);
                console.log(`Ana może teraz publikować posty w 100% automatycznie w tle!\n`);

                await page.waitForTimeout(2000);
                await browser.close();
                process.exit(0);
            }
        } catch (e) {
            // Context might be closed
        }
    }, 2000);
}

if (require.main === module) {
    loginTikTok().catch(err => {
        console.error(`Błąd:`, err.message);
        process.exit(1);
    });
}

module.exports = loginTikTok;

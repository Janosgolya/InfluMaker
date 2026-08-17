const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/instagram_session.json');

async function loginInstagram() {
    console.log(`\n======================================================`);
    console.log(`📸 INFLUMAKER: Instagram Browser Login`);
    console.log(`======================================================`);
    console.log(`Uruchamiam okno logowania Instagrama...`);

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
    console.log(`🌐 Otwieram https://www.instagram.com/accounts/login/ ...`);
    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'domcontentloaded' });

    console.log(`\n👉 Zaloguj sie w otwartym oknie na konto Betty (@secretsofthelondonmansion).`);
    console.log(`Skrypt sam wykryje zalogowanie i zapisze sesje...\n`);

    const pollInterval = setInterval(async () => {
        try {
            const cookies = await context.cookies();
            const sessionCookie = cookies.find(c => c.name === 'sessionid');
            const currentUrl = page.url();

            if (sessionCookie && !currentUrl.includes('/accounts/login') && !currentUrl.includes('/accounts/emailsignup')) {
                clearInterval(pollInterval);
                console.log(`\n🎉 WYKRYTO ZALOGOWANIE! Zapisuję sesję do config/instagram_session.json...`);

                await context.storageState({ path: SESSION_PATH });
                console.log(`💾 Sukces! Plik sesji zapisany.`);
                console.log(`Ana może teraz publikować posty na Instagramie w 100% automatycznie!\n`);

                await page.waitForTimeout(2000);
                await browser.close();
                process.exit(0);
            }
        } catch (e) {
            // Context might be navigating
        }
    }, 2000);
}

if (require.main === module) {
    loginInstagram().catch(err => {
        console.error(`Błąd:`, err.message);
        process.exit(1);
    });
}

module.exports = loginInstagram;

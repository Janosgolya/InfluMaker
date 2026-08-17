const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/instagram_session.json');

async function switchAndLoginInstagram() {
    console.log(`\n======================================================`);
    console.log(`📸 INSTAGRAM: Logowanie na przygotowane konto Betty`);
    console.log(`======================================================`);
    console.log(`Otwieram okno przeglądarki...`);
    console.log(`Przełącz / wyloguj się i zaloguj na przygotowane konto dla Betty.`);

    const browser = await chromium.launch({
        headless: false,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--start-maximized'
        ]
    });

    // Start with current session or fresh context
    const context = await browser.newContext({
        storageState: fs.existsSync(SESSION_PATH) ? SESSION_PATH : undefined,
        viewport: null,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();
    await page.goto('https://www.instagram.com', { waitUntil: 'domcontentloaded' });

    console.log(`\n👉 Zaloguj się w otwartym oknie na konto Betty.`);
    console.log(`Gdy będziesz na profilu Betty, skrypt automatycznie zapisze nową sesję i zamknie okno.\n`);

    let initialUserId = null;
    try {
        const initialCookies = await context.cookies();
        const uidCookie = initialCookies.find(c => c.name === 'ds_user_id');
        if (uidCookie) initialUserId = uidCookie.value;
    } catch (e) {}

    const pollInterval = setInterval(async () => {
        try {
            const cookies = await context.cookies();
            const sessionCookie = cookies.find(c => c.name === 'sessionid');
            const uidCookie = cookies.find(c => c.name === 'ds_user_id');

            // If user logged into a new account (different user ID or freshly logged in)
            if (sessionCookie && uidCookie && (initialUserId === null || uidCookie.value !== initialUserId || page.url().includes('/'))) {
                const currentUrl = page.url();
                
                // If user is on an active feed/profile page (not login page)
                if (!currentUrl.includes('/accounts/login') && !currentUrl.includes('/accounts/emailsignup') && uidCookie.value !== initialUserId) {
                    clearInterval(pollInterval);
                    console.log(`\n🎉 WYKRYTO NOWE KONTO (User ID: ${uidCookie.value})!`);
                    console.log(`Zapisuję sesję...`);

                    await page.waitForTimeout(3000);
                    await context.storageState({ path: SESSION_PATH });
                    console.log(`💾 Nowa sesja zapisana w: ${SESSION_PATH}\n`);

                    await page.waitForTimeout(2000);
                    await browser.close();
                    process.exit(0);
                }
            }
        } catch (e) {}
    }, 2000);
}

if (require.main === module) {
    switchAndLoginInstagram().catch(err => {
        console.error(`Błąd:`, err.message);
        process.exit(1);
    });
}

module.exports = switchAndLoginInstagram;

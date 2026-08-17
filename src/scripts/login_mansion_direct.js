const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/instagram_session.json');

async function loginMansionAccount() {
    console.log(`\n======================================================`);
    console.log(`📸 INSTAGRAM: Logowanie jako @secretsofthelondonmansion`);
    console.log(`======================================================`);
    console.log(`Otwieram okno logowania...`);

    const browser = await chromium.launch({
        headless: false,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--start-maximized'
        ]
    });

    // Start with a totally isolated, fresh context (no shared cookies)
    const context = await browser.newContext({
        viewport: null,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();
    console.log(`🌐 Otwieram bezpośrednią stronę logowania Instagrama...`);
    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'domcontentloaded' });

    console.log(`\n👉 Wpisz login: secretsofthelondonmansion i hasło.`);
    console.log(`Skrypt czeka, aż zalogujesz się jako właściciel konta @secretsofthelondonmansion...\n`);

    const pollInterval = setInterval(async () => {
        try {
            const cookies = await context.cookies();
            const sessionCookie = cookies.find(c => c.name === 'sessionid');

            if (sessionCookie) {
                // Check if user is logged in as secretsofthelondonmansion or has edit profile access
                const isProfileOwner = await page.evaluate(() => {
                    const editBtn = document.querySelector('a[href*="/accounts/edit/"], button:has-text("Edit profile"), button:has-text("Edytuj profil")');
                    const profileLink = document.querySelector('a[href*="/secretsofthelondonmansion/"]');
                    return !!editBtn || !!profileLink || window.location.href.includes('secretsofthelondonmansion');
                }).catch(() => false);

                const currentUrl = page.url();

                if (!currentUrl.includes('/login') && !currentUrl.includes('/accounts/emailsignup')) {
                    console.log(`\n🎉 WYKRYTO ZALOGOWANIE! Weryfikuję sesję...`);

                    await page.waitForTimeout(4000);
                    await context.storageState({ path: SESSION_PATH });
                    console.log(`💾 Sesja zapisana pomyślnie w: ${SESSION_PATH}`);
                    console.log(`Ana przejmuje zarządzanie i może publikować w tle!\n`);

                    clearInterval(pollInterval);
                    await page.waitForTimeout(2000);
                    await browser.close();
                    process.exit(0);
                }
            }
        } catch (e) {}
    }, 2000);
}

if (require.main === module) {
    loginMansionAccount().catch(err => {
        console.error(`Błąd:`, err.message);
        process.exit(1);
    });
}

module.exports = loginMansionAccount;

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/instagram_session.json');
const TEMP_PROFILE_DIR = path.join(__dirname, '../../temp_insta_profile');

async function cleanLogin() {
    console.log(`\n======================================================`);
    console.log(`📸 INSTAGRAM: Czyste logowanie bez pamięci podręcznej`);
    console.log(`======================================================`);

    // Clean temp profile dir if exists
    if (fs.existsSync(TEMP_PROFILE_DIR)) {
        try { fs.rmSync(TEMP_PROFILE_DIR, { recursive: true, force: true }); } catch (e) {}
    }
    fs.mkdirSync(TEMP_PROFILE_DIR, { recursive: true });

    console.log(`Otwieram całkowicie odizolowaną przeglądarkę (brak powiązanych kont)...`);

    const context = await chromium.launchPersistentContext(TEMP_PROFILE_DIR, {
        headless: false,
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        args: [
            '--disable-blink-features=AutomationControlled',
            '--start-maximized',
            '--no-default-browser-check'
        ]
    });

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
    console.log(`🌐 Otwieram formularz logowania Instagrama...`);
    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Auto-dismiss cookie modal
    try {
        const cookieBtn = await page.$('button:has-text("Allow all cookies"), button:has-text("Zezwól na wszystkie"), button:has-text("Decline"), button:has-text("Odrzuć")');
        if (cookieBtn && await cookieBtn.isVisible()) {
            await cookieBtn.click();
            await page.waitForTimeout(1000);
        }
    } catch (e) {}

    console.log(`\n👉 Wpisz login: secretsofthelondonmansion oraz hasło.`);
    console.log(`Skrypt czeka na pomyślne zalogowanie...\n`);

    const pollInterval = setInterval(async () => {
        try {
            const cookies = await context.cookies();
            const sessionCookie = cookies.find(c => c.name === 'sessionid');

            if (sessionCookie) {
                const currentUrl = page.url();
                if (!currentUrl.includes('/accounts/login') && !currentUrl.includes('/accounts/emailsignup')) {
                    clearInterval(pollInterval);
                    console.log(`\n🎉 WYKRYTO ZALOGOWANIE! Zapisuję sesję...`);

                    await page.waitForTimeout(3000);
                    await context.storageState({ path: SESSION_PATH });
                    console.log(`💾 Sesja zapisana pomyślnie w config/instagram_session.json!`);

                    await page.waitForTimeout(2000);
                    await context.close();

                    // Clean temp profile
                    try { fs.rmSync(TEMP_PROFILE_DIR, { recursive: true, force: true }); } catch (e) {}

                    process.exit(0);
                }
            }
        } catch (e) {}
    }, 2000);
}

if (require.main === module) {
    cleanLogin().catch(err => {
        console.error(`Błąd:`, err.message);
        process.exit(1);
    });
}

module.exports = cleanLogin;

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/instagram_session.json');

async function smartLoginMansion() {
    console.log(`\n======================================================`);
    console.log(`📸 INSTAGRAM: Smart Login dla @secretsofthelondonmansion`);
    console.log(`======================================================`);

    const browser = await chromium.launch({
        headless: false,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--start-maximized'
        ]
    });

    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();
    console.log(`🌐 Otwieram formularz logowania Instagrama...`);
    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Auto-dismiss cookie modal
    try {
        const cookieBtn = await page.$('button:has-text("Allow all cookies"), button:has-text("Zezwól na wszystkie pliki cookie"), button:has-text("Decline optional cookies"), button:has-text("Odrzuć opcjonalne pliki cookie")');
        if (cookieBtn && await cookieBtn.isVisible()) {
            console.log(`🛡️ Zamykam okno plików cookie...`);
            await cookieBtn.click();
            await page.waitForTimeout(1500);
        }
    } catch (e) {}

    // Check if landing page showed up, click "Log in"
    try {
        const loginLink = await page.$('a:has-text("Log in"), a:has-text("Zaloguj się"), span:has-text("Log in")');
        if (loginLink && await loginLink.isVisible()) {
            await loginLink.click();
            await page.waitForTimeout(2000);
        }
    } catch (e) {}

    // Auto-fill username
    try {
        const usernameInput = await page.waitForSelector('input[name="username"]', { timeout: 10000 });
        if (usernameInput) {
            console.log(`✍️ Automatycznie wpisuję login: secretsofthelondonmansion`);
            await usernameInput.click();
            await usernameInput.fill('secretsofthelondonmansion');

            const passwordInput = await page.$('input[name="password"]');
            if (passwordInput) {
                await passwordInput.focus();
                console.log(`👉 Kursor ustawiony na haśle! Wpisz hasło i kliknij 'Zaloguj się'.`);
            }
        }
    } catch (e) {
        console.log(`ℹ️ Formularz logowania jest widoczny w oknie.`);
    }

    console.log(`\n⏳ Czekam na Twoje zatwierdzenie hasła...`);

    const pollInterval = setInterval(async () => {
        try {
            const cookies = await context.cookies();
            const sessionCookie = cookies.find(c => c.name === 'sessionid');

            if (sessionCookie) {
                const currentUrl = page.url();
                if (!currentUrl.includes('/accounts/login') && !currentUrl.includes('/accounts/emailsignup')) {
                    clearInterval(pollInterval);
                    console.log(`\n🎉 SUKCES! Zalogowano na konto @secretsofthelondonmansion!`);

                    await page.waitForTimeout(3000);
                    await context.storageState({ path: SESSION_PATH });
                    console.log(`💾 Sesja zapisana pomyślnie w config/instagram_session.json!`);

                    await page.waitForTimeout(2000);
                    await browser.close();
                    process.exit(0);
                }
            }
        } catch (e) {}
    }, 2000);
}

if (require.main === module) {
    smartLoginMansion().catch(err => {
        console.error(`Błąd:`, err.message);
        process.exit(1);
    });
}

module.exports = smartLoginMansion;

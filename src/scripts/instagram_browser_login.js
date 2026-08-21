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
                // Detect active username
                const detectedUser = await page.evaluate(() => {
                    const links = Array.from(document.querySelectorAll('a[href^="/"]'));
                    for (const link of links) {
                        const href = link.getAttribute('href');
                        if (href && href.startsWith('/') && !href.startsWith('/explore') && !href.startsWith('/reels') && !href.startsWith('/direct') && !href.startsWith('/your_activity') && !href.startsWith('/accounts') && !href.startsWith('/stories') && href.split('/').filter(Boolean).length === 1) {
                            const candidate = href.replace(/\//g, '').trim().toLowerCase();
                            if (candidate) return candidate;
                        }
                    }
                    return null;
                });

                if (detectedUser && detectedUser !== 'secretsofthelondonmansion') {
                    console.log(`⚠️ UWAGA: Zalogowano jako @${detectedUser}! Przełącz konto na @secretsofthelondonmansion w oknie przeglądarki...`);
                    return;
                }

                clearInterval(pollInterval);
                console.log(`\n🎉 WYKRYTO PRAWIDŁOWE KONTO @secretsofthelondonmansion!`);
                console.log(`💾 Zapisuję sesję do config/instagram_session.json...`);

                await context.storageState({ path: SESSION_PATH });

                // Also save minified version for easy copy-pasting to GitHub Secrets
                const minifiedPath = path.join(__dirname, '../../config/instagram_session_minified.txt');
                const raw = fs.readFileSync(SESSION_PATH, 'utf8');
                fs.writeFileSync(minifiedPath, JSON.stringify(JSON.parse(raw)), 'utf8');

                console.log(`✅ Sukces! Plik sesji zapisany.`);
                console.log(`📋 Minified gotowy do wklejenia w GitHub Secrets: config/instagram_session_minified.txt\n`);

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

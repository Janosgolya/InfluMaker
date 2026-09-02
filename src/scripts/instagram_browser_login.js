const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/instagram_session.json');
const PROFILE_DIR = path.join(__dirname, '../../config/instagram_chrome_profile');

async function loginInstagram() {
    console.log(`\n======================================================`);
    console.log(`📸 INFLUMAKER: Instagram Multi-Account Login Helper`);
    console.log(`======================================================`);
    console.log(`Uruchamiam przeglądarkę z obsługą wyboru Twoich kont...`);

    if (!fs.existsSync(PROFILE_DIR)) {
        fs.mkdirSync(PROFILE_DIR, { recursive: true });
    }

    const context = await chromium.launchPersistentContext(PROFILE_DIR, {
        headless: false,
        viewport: null,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--start-maximized'
        ],
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    // If existing session exists, inject cookies so saved accounts remain available
    if (fs.existsSync(SESSION_PATH)) {
        try {
            const rawSession = JSON.parse(fs.readFileSync(SESSION_PATH, 'utf8'));
            if (rawSession.cookies) {
                await context.addCookies(rawSession.cookies);
            }
        } catch (e) {}
    }

    console.log(`🌐 Otwieram stronę główną Instagrama...`);
    await page.goto('https://www.instagram.com', { waitUntil: 'domcontentloaded' });

    console.log(`\n👉 W otwartym oknie:`);
    console.log(`   - Wybierz / przełącz profil na: @secretsofthelondonmansion`);
    console.log(`   - Jeśli jesteś zalogowany na inne konto, kliknij 'Więcej' -> 'Przełącz konta' -> wybierz @secretsofthelondonmansion`);
    console.log(`   - Skrypt automatycznie wykryje konto Betty i zapisze sesję.\n`);

    const pollInterval = setInterval(async () => {
        try {
            const cookies = await context.cookies();
            const sessionCookie = cookies.find(c => c.name === 'sessionid');
            const currentUrl = page.url();

            if (sessionCookie && !currentUrl.includes('/accounts/login') && !currentUrl.includes('/accounts/emailsignup')) {
                // Detect active username
                const detectedUser = await page.evaluate(() => {
                    // Check URL if on profile
                    const match = window.location.pathname.match(/^\/([A-Za-z0-9_.]+)\/?$/);
                    if (match && !['explore', 'reels', 'direct', 'stories', 'accounts'].includes(match[1])) {
                        return match[1].toLowerCase();
                    }

                    // Check sidebar navigation profile link
                    const links = Array.from(document.querySelectorAll('a[href^="/"]'));
                    for (const link of links) {
                        const href = link.getAttribute('href');
                        if (href && href.startsWith('/') && !href.startsWith('/explore') && !href.startsWith('/reels') && !href.startsWith('/direct') && !href.startsWith('/your_activity') && !href.startsWith('/accounts') && !href.startsWith('/stories')) {
                            const parts = href.split('/').filter(Boolean);
                            if (parts.length === 1 && parts[0].length > 2) {
                                return parts[0].toLowerCase();
                            }
                        }
                    }
                    return null;
                });

                if (detectedUser) {
                    if (detectedUser !== 'secretsofthelondonmansion') {
                        console.log(`ℹ️ Aktywne konto w oknie: @${detectedUser}. Przełącz na @secretsofthelondonmansion...`);
                        return;
                    }

                    clearInterval(pollInterval);
                    console.log(`\n🎉 WYKRYTO PRAWIDŁOWE KONTO @secretsofthelondonmansion!`);
                    console.log(`💾 Zapisuję sesję do config/instagram_session.json...`);

                    await context.storageState({ path: SESSION_PATH });

                    // Encrypt and persist session to config/.instagram_session.enc for git tracking
                    const InstagramSessionStorage = require('../services/instagram_session_storage');
                    InstagramSessionStorage.persist();

                    // Also save minified version for easy copy-pasting to GitHub Secrets
                    const minifiedPath = path.join(__dirname, '../../config/instagram_session_minified.txt');
                    const raw = fs.readFileSync(SESSION_PATH, 'utf8');
                    fs.writeFileSync(minifiedPath, JSON.stringify(JSON.parse(raw)), 'utf8');

                    console.log(`✅ Sukces! Plik sesji zapisany i zaszyfrowany do config/.instagram_session.enc!`);
                    console.log(`📋 Minified gotowy do wklejenia w GitHub Secrets: config/instagram_session_minified.txt\n`);

                    await page.waitForTimeout(2000);
                    await context.close();
                    process.exit(0);
                }
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

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const InstagramSessionStorage = require('../services/instagram_session_storage');

const SESSION_PATH = path.join(__dirname, '../../config/instagram_session.json');
const PROFILE_DIR = path.join(__dirname, '../../config/instagram_chrome_profile');

async function loginInstagram() {
    console.log(`\n======================================================`);
    console.log(`📸 INFLUMAKER: Instagram Profile Chooser & Login Helper`);
    console.log(`======================================================`);
    console.log(`Uruchamiam okno przeglądarki z obsługą wyboru Twoich kont...`);

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

    console.log(`🌐 Otwieram stronę Instagram...`);
    await page.goto('https://www.instagram.com', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // 1. If Instagram shows a one-tap screen locked to personal account (e.g. bocianjanusz), automatically click "Use another profile"
    try {
        const useAnotherBtn = page.locator('button:has-text("Use another profile"), div[role="button"]:has-text("Use another profile"), span:has-text("Use another profile"), button:has-text("Użyj innego profilu"), div[role="button"]:has-text("Użyj innego profilu"), span:has-text("Użyj innego profilu")');
        if (await useAnotherBtn.count() > 0) {
            console.log(`👉 Wykryto ekran pojedynczego konta. Klikam automatycznie 'Użyj innego profilu', aby otworzyć wybór i logowanie...`);
            await useAnotherBtn.first().click();
            await page.waitForTimeout(2000);
        }
    } catch (e) {}

    // 2. If logged in to another account on feed, automatically open "Switch accounts" modal
    try {
        const moreBtn = page.locator('svg[aria-label="Settings"], svg[aria-label="Ustawienia"], span:has-text("More"), span:has-text("Więcej")').first();
        if (await moreBtn.count() > 0 && await moreBtn.isVisible()) {
            console.log(`👉 Wykryto zalogowane inne konto. Otwieram menu 'Więcej' -> 'Przełącz konta'...`);
            await moreBtn.click();
            await page.waitForTimeout(1000);
            const switchBtn = page.locator('span:has-text("Switch accounts"), span:has-text("Przełącz konta"), button:has-text("Switch accounts"), button:has-text("Przełącz konta")').first();
            if (await switchBtn.count() > 0 && await switchBtn.isVisible()) {
                await switchBtn.click();
                console.log(`📋 Okno wyboru Twoich kont zostało otwarte!`);
            }
        }
    } catch (e) {}

    console.log(`\n======================================================`);
    console.log(`👉 W OTWARTYM OKNIE PRZEGLĄDARKI:`);
    console.log(`   1. Jeśli widzisz listę profili - wybierz @secretsofthelondonmansion,`);
    console.log(`   2. Lub wpisz login: secretsofthelondonmansion i hasło.`);
    console.log(`   3. Jak tylko zalogujesz się na konto Betty, skrypt to wykryje`);
    console.log(`      i automatycznie zapisze oraz zaszyfruje sesję.`);
    console.log(`======================================================\n`);

    const pollInterval = setInterval(async () => {
        try {
            const cookies = await context.cookies();
            const sessionCookie = cookies.find(c => c.name === 'sessionid');
            const currentUrl = page.url();

            if (sessionCookie && !currentUrl.includes('/accounts/login') && !currentUrl.includes('/accounts/emailsignup')) {
                // Detect active username
                const detectedUser = await page.evaluate(() => {
                    // Check URL pathname
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
                        // User is on another account, do not save
                        return;
                    }

                    clearInterval(pollInterval);
                    console.log(`\n🎉 WYKRYTO PRAWIDŁOWE KONTO @secretsofthelondonmansion!`);
                    console.log(`💾 Zapisuję sesję i szyfruję stan dla chmury...`);

                    await context.storageState({ path: SESSION_PATH });

                    // Encrypt and persist session to config/.instagram_session.enc for git tracking
                    InstagramSessionStorage.persist();

                    // Also save minified version
                    const minifiedPath = path.join(__dirname, '../../config/instagram_session_minified.txt');
                    const raw = fs.readFileSync(SESSION_PATH, 'utf8');
                    fs.writeFileSync(minifiedPath, JSON.stringify(JSON.parse(raw)), 'utf8');

                    console.log(`\n======================================================`);
                    console.log(`✅ SUKCES! Sesja @secretsofthelondonmansion zapisana i zaszyfrowana!`);
                    console.log(`📁 config/instagram_session.json`);
                    console.log(`🔒 config/.instagram_session.enc`);
                    console.log(`======================================================\n`);

                    await page.waitForTimeout(3000);
                    await context.close();
                    process.exit(0);
                }
            }
        } catch (e) {
            // Context might be navigating
        }
    }, 1500);
}

if (require.main === module) {
    loginInstagram().catch(err => {
        console.error(`Błąd:`, err.message);
        process.exit(1);
    });
}

module.exports = loginInstagram;

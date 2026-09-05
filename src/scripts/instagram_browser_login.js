const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const InstagramSessionStorage = require('../services/instagram_session_storage');

const SESSION_PATH = path.join(__dirname, '../../config/instagram_session.json');
const PROFILE_DIR = path.join(__dirname, '../../config/instagram_chrome_profile');
const MINIFIED_PATH = path.join(__dirname, '../../config/instagram_session_minified.txt');
const TARGET_ACCOUNT = 'secretsofthelondonmansion';

const IG_RESERVED = [
    'explore', 'reels', 'direct', 'your_activity', 'accounts', 'stories',
    'popular', 'about', 'legal', 'privacy', 'terms', 'locations', 'directory',
    'meta', 'threads', 'developer', 'api', 'help', 'blog', 'jobs', 'press',
    'contact', 'lite', 'web', 'settings', 'emailsignup', 'login', 'signup',
    'password', 'download', 'support', 'terms_and_policies'
];

async function detectActiveUser(page) {
    try {
        return await page.evaluate((reservedList) => {
            const reserved = new Set(reservedList.map(r => r.toLowerCase()));

            // Priority 1: Current URL pathname
            const match = window.location.pathname.match(/^\/([A-Za-z0-9_.]+)\/?$/);
            if (match && !reserved.has(match[1].toLowerCase())) {
                return match[1].toLowerCase();
            }

            // Priority 2: Navigation sidebar profile link
            const navLinks = Array.from(document.querySelectorAll('nav a[href^="/"], div[role="navigation"] a[href^="/"], header a[href^="/"]'));
            for (const a of navLinks) {
                const href = a.getAttribute('href') || '';
                const parts = href.split('/').filter(Boolean);
                if (parts.length === 1 && !reserved.has(parts[0].toLowerCase())) {
                    return parts[0].toLowerCase();
                }
            }

            // Priority 3: Avatar image alt text ("username's profile picture")
            const profileImgs = Array.from(document.querySelectorAll('img[alt*="profile picture"], img[alt*="zdjęcie profilowe"]'));
            for (const img of profileImgs) {
                const alt = img.getAttribute('alt') || '';
                const m = alt.match(/^([^'’s]+)['’]s profile picture/i) || alt.match(/Zdjęcie profilowe użytkownika ([^\s]+)/i);
                if (m && m[1] && !reserved.has(m[1].trim().toLowerCase())) {
                    return m[1].trim().toLowerCase();
                }
            }

            return null;
        }, IG_RESERVED);
    } catch (e) {
        return null;
    }
}

async function dismissBanners(page) {
    try {
        // Cookie consent buttons
        const cookieBtns = await page.$$('button:has-text("Decline optional cookies"), button:has-text("Allow all cookies"), button:has-text("Odrzuć opcjonalne"), button:has-text("Zezwól na wszystkie"), button:has-text("Only allow essential cookies"), button:has-text("Allow essential and optional cookies")');
        for (const btn of cookieBtns) {
            if (await btn.isVisible().catch(() => false)) {
                await btn.click().catch(() => {});
                await page.waitForTimeout(800);
            }
        }
    } catch (e) {}
}

async function loginInstagram() {
    console.log(`\n======================================================`);
    console.log(`📸 INFLUMAKER: Instagram Bulletproof Login & Session Sync`);
    console.log(`Target Account: @${TARGET_ACCOUNT}`);
    console.log(`======================================================`);
    console.log(`Uruchamiam przeglądarkę z dedykowanym profilem...`);

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

    console.log(`🌐 Otwieram https://www.instagram.com ...`);
    await page.goto('https://www.instagram.com', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await dismissBanners(page);

    console.log(`\n======================================================`);
    console.log(`👉 INSTRUKCJA LOGOWANIA:`);
    console.log(`   1. Jeśli widzisz przycisk 'Continue / Kontynuuj' dla bocianjanusz:`);
    console.log(`      - Kliknij go i wpisz hasło, LUB kliknij 'Use another profile' i wpisz dane.`);
    console.log(`   2. Po zalogowaniu upewnij się, że jesteś na profilu @${TARGET_ACCOUNT}:`);
    console.log(`      - Jeśli jesteś na koncie głównym, kliknij 'Switch / Przełącz konta' i wybierz Betty.`);
    console.log(`   3. Możesz też po prostu przejść na stronę: https://www.instagram.com/${TARGET_ACCOUNT}/`);
    console.log(`   4. Jak tylko skrypt wykryje aktywne konto @${TARGET_ACCOUNT}`);
    console.log(`      z poprawnym ciasteczkiem sesji, automatycznie zapisze i zaszyfruje dane!`);
    console.log(`======================================================\n`);

    let lastReportedUser = null;
    let saved = false;

    const pollInterval = setInterval(async () => {
        if (saved) return;
        try {
            const cookies = await context.cookies();
            const sessionCookie = cookies.find(c => c.name === 'sessionid');
            const uidCookie = cookies.find(c => c.name === 'ds_user_id');

            if (!sessionCookie || !sessionCookie.value || sessionCookie.value.trim().length < 15) {
                return;
            }

            const activeUser = await detectActiveUser(page);

            if (activeUser && activeUser !== lastReportedUser) {
                lastReportedUser = activeUser;
                console.log(`[Instagram Sync] 👤 Wykryto zalogowane konto: @${activeUser}`);
                if (activeUser !== TARGET_ACCOUNT) {
                    console.log(`[Instagram Sync] ℹ️ Czekam na przełączenie na profil @${TARGET_ACCOUNT}...`);
                }
            }

            // Check if active user matches or if user navigated to target profile
            const currentUrl = page.url();
            const onTargetProfile = currentUrl.toLowerCase().includes(`/${TARGET_ACCOUNT}`);

            if ((activeUser === TARGET_ACCOUNT || onTargetProfile) && sessionCookie) {
                saved = true;
                clearInterval(pollInterval);

                console.log(`\n🎉 WYKRYTO PRAWIDŁOWE KONTO @${TARGET_ACCOUNT}!`);
                console.log(`🔑 Weryfikuję poprawność ciasteczka sessionid...`);
                console.log(`   User ID: ${uidCookie ? uidCookie.value : 'ok'}`);
                console.log(`   Session length: ${sessionCookie.value.length} znaków`);

                // Capture full storage state
                const storageState = await context.storageState({ path: SESSION_PATH });

                if (!InstagramSessionStorage.isValidSession(storageState)) {
                    console.error(`❌ Błąd: pobrane ciasteczka nie przeszły testu ważności. Spróbuj ponownie.`);
                    saved = false;
                    return;
                }

                // Encrypt and persist session to config/.instagram_session.enc
                const persisted = InstagramSessionStorage.persist(storageState);

                // Save minified version for GitHub Secrets
                const minifiedPayload = JSON.stringify(storageState);
                fs.writeFileSync(MINIFIED_PATH, minifiedPayload, 'utf8');

                console.log(`\n======================================================`);
                console.log(`✅ SUKCES! Połączenie z Instagramem zostało w 100% zapisane!`);
                console.log(`📁 1. Lokalna sesja: config/instagram_session.json`);
                console.log(`🔒 2. Zaszyfrowana kopia: config/.instagram_session.enc (${persisted ? 'Zapisana' : 'Błąd'})`);
                console.log(`📋 3. Gotowy token do GitHub Secrets: config/instagram_session_minified.txt`);
                console.log(`======================================================`);
                console.log(`👉 ABY URUCHOMIĆ W PEŁNI AUTOMATYCZNIE W CHMURZE GITHUB:`);
                console.log(`   Otwórz: GitHub -> InfluMaker -> Settings -> Secrets -> Actions`);
                console.log(`   Zaktualizuj sekret: INSTAGRAM_SESSION_JSON`);
                console.log(`   wklejając całą zawartość pliku: config/instagram_session_minified.txt`);
                console.log(`======================================================\n`);

                await page.waitForTimeout(3000);
                await context.close();
                process.exit(0);
            }
        } catch (e) {
            if (e.message.includes('Target page, context or browser has been closed') || e.message.includes('browser has been closed')) {
                clearInterval(pollInterval);
                console.log(`\nℹ️ Okno przeglądarki zostało zamknięte.`);
                process.exit(0);
            }
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

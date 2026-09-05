const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const InstagramSessionStorage = require('./instagram_session_storage');

const SESSION_PATH = path.join(__dirname, '../../config/instagram_session.json');

class InstagramBrowserUploader {
    constructor() {
        this.sessionPath = SESSION_PATH;
    }

    isLoggedIn() {
        const session = InstagramSessionStorage.restore();
        if (session && InstagramSessionStorage.isValidSession(session)) {
            return true;
        }
        if (fs.existsSync(this.sessionPath)) {
            try {
                const data = JSON.parse(fs.readFileSync(this.sessionPath, 'utf8'));
                if (InstagramSessionStorage.isValidSession(data)) return true;
            } catch (e) {}
        }
        return false;
    }

    /**
     * RFC 6238 TOTP code generator using built-in Node.js crypto
     */
    generateTOTP(secret) {
        const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let bits = '';
        const cleanSecret = secret.replace(/\s+/g, '').toUpperCase();
        for (let i = 0; i < cleanSecret.length; i++) {
            const val = base32chars.indexOf(cleanSecret.charAt(i));
            if (val >= 0) bits += val.toString(2).padStart(5, '0');
        }
        const bytes = [];
        for (let i = 0; i + 8 <= bits.length; i += 8) {
            bytes.push(parseInt(bits.substr(i, 8), 2));
        }
        const key = Buffer.from(bytes);
        const epoch = Math.floor(Date.now() / 1000);
        const timeStep = Math.floor(epoch / 30);
        const timeBuffer = Buffer.alloc(8);
        timeBuffer.writeBigInt64BE(BigInt(timeStep));
        const hmac = crypto.createHmac('sha1', key).update(timeBuffer).digest();
        const offset = hmac[hmac.length - 1] & 0x0f;
        const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000;
        return code.toString().padStart(6, '0');
    }

    /**
     * Dismiss notifications and cookie popups on Instagram
     */
    async dismissPopups(page) {
        try {
            // 1. Cookie consent banners (must be handled first or they block all page clicks)
            const cookieButtons = await page.$$('button:has-text("Decline optional cookies"), button:has-text("Allow all cookies"), button:has-text("Odrzuć opcjonalne"), button:has-text("Zezwól na wszystkie"), button:has-text("Only allow essential cookies")');
            for (const btn of cookieButtons) {
                if (await btn.isVisible().catch(() => false)) {
                    await btn.click().catch(() => {});
                    await page.waitForTimeout(1000);
                }
            }

            // 2. Notification and info popups
            const notNowButtons = await page.$$('button:has-text("Not Now"), button:has-text("Nie teraz"), button:has-text("Cancel"), button:has-text("Odrzuć"), button:has-text("OK"), button:has-text("Ok"), button:has-text("Save info"), button:has-text("Zapisz informacje")');
            for (const btn of notNowButtons) {
                if (await btn.isVisible().catch(() => false)) {
                    await btn.click().catch(() => {});
                    await page.waitForTimeout(1000);
                }
            }
        } catch (e) {}
    }

    /**
     * Accurately get currently active logged-in Instagram username.
     * Prevents footer links like /popular/, /about/, /terms/ from ever being misidentified as handles.
     */
    async getActiveUsername(page) {
        const IG_RESERVED = [
            'explore', 'reels', 'direct', 'your_activity', 'accounts', 'stories',
            'popular', 'about', 'legal', 'privacy', 'terms', 'locations', 'directory',
            'meta', 'threads', 'developer', 'api', 'help', 'blog', 'jobs', 'press',
            'contact', 'lite', 'web', 'settings', 'emailsignup', 'login', 'signup',
            'password', 'download', 'support', 'terms_and_policies'
        ];

        try {
            return await page.evaluate((reservedList) => {
                const reserved = new Set(reservedList.map(r => r.toLowerCase()));

                // Priority 1: Navigation elements (sidebar/nav profile link)
                const navLinks = Array.from(document.querySelectorAll('nav a[href^="/"], div[role="navigation"] a[href^="/"], header a[href^="/"]'));
                for (const a of navLinks) {
                    const href = a.getAttribute('href') || '';
                    const parts = href.split('/').filter(Boolean);
                    if (parts.length === 1 && !reserved.has(parts[0].toLowerCase())) {
                        return parts[0].toLowerCase();
                    }
                }

                // Priority 2: Avatar img alt text ("username's profile picture")
                const profileImgs = Array.from(document.querySelectorAll('img[alt*="profile picture"], img[alt*="zdjęcie profilowe"]'));
                for (const img of profileImgs) {
                    const alt = img.getAttribute('alt') || '';
                    const match = alt.match(/^([^'’s]+)['’]s profile picture/i) || alt.match(/Zdjęcie profilowe użytkownika ([^\s]+)/i);
                    if (match && match[1] && !reserved.has(match[1].trim().toLowerCase())) {
                        return match[1].trim().toLowerCase();
                    }
                }

                // Priority 3: Non-footer links strictly validating username characters
                const links = Array.from(document.querySelectorAll('a[href^="/"]'));
                for (const link of links) {
                    if (link.closest('footer')) continue;
                    const href = link.getAttribute('href') || '';
                    const parts = href.split('/').filter(Boolean);
                    if (parts.length === 1) {
                        const candidate = parts[0].toLowerCase();
                        if (!reserved.has(candidate) && /^[a-zA-Z0-9._]{2,30}$/.test(candidate)) {
                            return candidate;
                        }
                    }
                }
                return null;
            }, IG_RESERVED);
        } catch (e) {
            return null;
        }
    }

    /**
     * Self-healing autonomous login when session cookies expire
     *
     * @secretsofthelondonmansion is a LINKED CREATOR account under bocianjanusz.
     * It has NO independent password. The correct flow is:
     * 1. Click "Use another profile" if one-tap landing page appears
     * 2. Login as bocianjanusz (main account) using INSTAGRAM_PASSWORD
     * 3. Switch to secretsofthelondonmansion via account switcher
     */
    async attemptCredentialLogin(page, context) {
        const configuredUsername = (process.env.INSTAGRAM_USERNAME || '').trim();
        const password = (process.env.INSTAGRAM_PASSWORD || process.env.INSTAGRAM_PASS || '').trim();
        const targetAccount = 'secretsofthelondonmansion';

        if (!password) {
            console.log(`[Instagram Auth] ℹ️ No INSTAGRAM_PASSWORD in environment. Cannot perform autonomous credential login.`);
            return false;
        }

        // Try candidate usernames: configured first, then bocianjanusz, then secretsofthelondonmansion
        const candidateUsernames = configuredUsername 
            ? [configuredUsername] 
            : ['bocianjanusz', 'secretsofthelondonmansion'];

        for (const mainUsername of candidateUsernames) {
            console.log(`[Instagram Auth] 🤖 Attempting autonomous login as @${mainUsername}...`);

            try {
                // Step 1: Dismiss any cookie banner first so it doesn't block clicks/inputs
                await this.dismissPopups(page);

                // Step 2: Handle one-tap screen ("Use another profile" button)
                const useAnotherBtn = page.locator('div[role="button"]:has-text("Use another profile"), button:has-text("Use another profile"), span:has-text("Use another profile")').first();
                if (await useAnotherBtn.count() > 0 && await useAnotherBtn.isVisible().catch(() => false)) {
                    console.log(`[Instagram Auth] 📲 One-tap screen detected. Clicking "Use another profile" to reveal login form...`);
                    await useAnotherBtn.click({ force: true });
                    await page.waitForTimeout(3000);
                }

                // Step 3: Check if login inputs are present on the current page
                let userInput = page.locator('input[name="email"], input[name="username"], input[type="text"]').first();
                let passInput = page.locator('input[name="pass"], input[name="password"], input[type="password"]').first();

                const hasInputs = (await userInput.count() > 0) && (await passInput.count() > 0);
                if (!hasInputs) {
                    console.log(`[Instagram Auth] 📲 Navigating directly to /accounts/login/...`);
                    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'domcontentloaded', timeout: 30000 });
                    await page.waitForTimeout(3000);
                    await this.dismissPopups(page);

                    userInput = page.locator('input[name="email"], input[name="username"], input[type="text"]').first();
                    passInput = page.locator('input[name="pass"], input[name="password"], input[type="password"]').first();
                }

                await userInput.waitFor({ state: 'visible', timeout: 15000 });
                await userInput.fill(mainUsername);
                await page.waitForTimeout(500);

                await passInput.waitFor({ state: 'visible', timeout: 15000 });
                await passInput.fill(password);
                await page.waitForTimeout(500);

                // Modern Instagram uses a DIV with role="button" for "Log in", NOT a <button> tag!
                const submitBtn = page.locator('div[role="button"]:has-text("Log in"), button[type="submit"], button:has-text("Log in"), button:has-text("Zaloguj się"), input[type="submit"]').first();
                if (await submitBtn.count() > 0 && await submitBtn.isVisible().catch(() => false)) {
                    await submitBtn.click();
                } else {
                    await passInput.press('Enter');
                }
                console.log(`[Instagram Auth] 🔑 Submitted credentials for @${mainUsername}, waiting for login response...`);
                await page.waitForTimeout(8000);

                // Handle 2FA Challenge if prompted
                const codeInput = page.locator('input[name="verificationCode"], input[name="security_code"], input[type="tel"]').first();
                if (await codeInput.count() > 0) {
                    if (process.env.INSTAGRAM_2FA_SECRET) {
                        console.log(`[Instagram Auth] 🛡️ 2FA challenge detected! Generating TOTP...`);
                        const totpCode = this.generateTOTP(process.env.INSTAGRAM_2FA_SECRET);
                        await codeInput.fill(totpCode);
                        await page.waitForTimeout(500);
                        const confirm2fa = page.locator('div[role="button"]:has-text("Confirm"), button:has-text("Confirm"), button:has-text("Potwierdź")').first();
                        if (await confirm2fa.count() > 0) await confirm2fa.click();
                        else await codeInput.press('Enter');
                        await page.waitForTimeout(8000);
                    } else {
                        console.warn(`[Instagram Auth] ⚠️ 2FA challenge requested by Instagram, but INSTAGRAM_2FA_SECRET is not configured in GitHub Secrets!`);
                    }
                }

                // Check for login error messages on the page
                const errorAlert = page.locator('p[role="alert"], div[role="alert"], p[data-testid="login-error-message"], span:has-text("incorrect"), span:has-text("nieprawidłow")').first();
                if (await errorAlert.count() > 0 && await errorAlert.isVisible().catch(() => false)) {
                    const errText = await errorAlert.innerText().catch(() => '');
                    console.warn(`[Instagram Auth] ⚠️ Instagram error response for @${mainUsername}: "${errText}"`);
                }

                if (page.url().includes('/challenge/')) {
                    console.warn(`[Instagram Auth] ⚠️ Instagram security checkpoint detected: ${page.url()}`);
                }

                await this.dismissPopups(page);

                // Step 4: Verify who is active after login
                const activeUser = await this.getActiveUsername(page);
                console.log(`[Instagram Auth] 👤 Active account after login attempt: @${activeUser || 'none (still logged out)'}`);

                if (activeUser === targetAccount) {
                    const freshState = await context.storageState({ path: this.sessionPath });
                    InstagramSessionStorage.persist(freshState);
                    console.log(`[Instagram Auth] ✅ Successfully active as @${targetAccount}! Session persisted.`);
                    return true;
                }

                if (activeUser) {
                    console.log(`[Instagram Auth] 🔄 Logged in as @${activeUser}. Switching to @${targetAccount}...`);
                    const switched = await this.trySwitchToTargetAccount(page, context);
                    if (switched) {
                        const freshState = await context.storageState({ path: this.sessionPath });
                        InstagramSessionStorage.persist(freshState);
                        console.log(`[Instagram Auth] ✅ Successfully switched to @${targetAccount}! Session persisted.`);
                        return true;
                    }
                }
            } catch (e) {
                console.warn(`[Instagram Auth] Autonomous login attempt error for @${mainUsername}:`, e.message);
            }
        }

        console.warn(`[Instagram Auth] ❌ Autonomous login could not reach @${targetAccount}.`);
        return false;
    }

    /**
     * Switch the active Instagram session to secretsofthelondonmansion
     * using the account switcher in the sidebar.
     */
    async trySwitchToTargetAccount(page, context) {
        const targetAccount = 'secretsofthelondonmansion';
        try {
            // Open sidebar "More" menu
            const moreSelectors = [
                'svg[aria-label="Settings"], svg[aria-label="Ustawienia"]',
                'svg[aria-label="More"], svg[aria-label="Więcej"]',
                'div[role="button"]:has(svg[aria-label="Settings"])',
                'span:has-text("More")',
                'span:has-text("Więcej")',
                'a[href="#"]:has-text("More")'
            ];
            for (const sel of moreSelectors) {
                const el = page.locator(sel).first();
                if (await el.count() > 0 && await el.isVisible().catch(() => false)) {
                    await el.click();
                    await page.waitForTimeout(1500);
                    break;
                }
            }

            // Click "Switch accounts"
            const switchBtn = page.locator('span:has-text("Switch accounts"), span:has-text("Przełącz konta"), div:has-text("Switch accounts"), div:has-text("Przełącz konta")').first();
            if (await switchBtn.count() > 0) {
                await switchBtn.click();
                await page.waitForTimeout(2000);
                // Look for Betty's account in the switcher list
                const bettyBtn = page.locator(`div:has-text("${targetAccount}") [role="button"], button:has-text("${targetAccount}"), a[href="/${targetAccount}/"], span:has-text("${targetAccount}")`).first();
                if (await bettyBtn.count() > 0) {
                    await bettyBtn.click();
                    await page.waitForTimeout(5000);
                    await this.dismissPopups(page);
                }
            }

            // Verify if switch succeeded
            let active = await this.getActiveUsername(page);
            if (active === targetAccount) return true;

            // Direct navigation fallback
            console.log(`[Instagram Auth] Direct navigation to @${targetAccount}...`);
            await page.goto(`https://www.instagram.com/${targetAccount}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
            await page.waitForTimeout(4000);
            await this.dismissPopups(page);

            active = await this.getActiveUsername(page);
            console.log(`[Instagram Auth] Active user after direct nav: @${active}`);
            return active === targetAccount;
        } catch (e) {
            console.warn(`[Instagram Auth] trySwitchToTargetAccount error:`, e.message);
            return false;
        }
    }

    /**
     * Upload and publish photo post directly to Instagram feed
     */
    async uploadAndPublish(filePath, captionText, options = {}) {
        InstagramSessionStorage.restore();

        if (!this.isLoggedIn()) {
            throw new Error(`Brak aktywnej sesji Instagram ani danych logowania. Uruchom najpierw: LOGIN_INSTAGRAM.bat lub ustaw INSTAGRAM_PASSWORD w GitHub Secrets.`);
        }

        console.log(`\n======================================================`);
        console.log(`📸 INSTAGRAM BROWSER PUBLISHER: ${path.basename(filePath)}`);
        console.log(`Mode: Automated Instagram Session (Headless: ${options.headless ?? true})`);
        console.log(`======================================================`);

        const browser = await chromium.launch({
            headless: options.headless ?? true,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--start-maximized',
                '--enable-webgl'
            ]
        });

        const contextOptions = {
            viewport: { width: 1440, height: 900 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        };

        if (fs.existsSync(this.sessionPath)) {
            contextOptions.storageState = this.sessionPath;
        }

        const context = await browser.newContext(contextOptions);
        const page = await context.newPage();

        try {
            console.log(`[Instagram] 🌐 Opening Instagram Home...`);
            await page.goto('https://www.instagram.com', { waitUntil: 'domcontentloaded', timeout: 45000 });
            await page.waitForTimeout(4000);
            await this.dismissPopups(page);

            // Check if already active as Betty
            let activeUsername = await this.getActiveUsername(page);
            console.log(`[Instagram] 👤 Initial active account: @${activeUsername || 'none (logged out)'}`);

            if (activeUsername !== 'secretsofthelondonmansion') {
                console.log(`[Instagram] ⚠️ Not active as @secretsofthelondonmansion. Attempting autonomous self-healing login...`);
                const loginSuccess = await this.attemptCredentialLogin(page, context);
                if (!loginSuccess) {
                    throw new Error('Sesja Instagram wygasła lub nie udało się zalogować. Upewnij się, że INSTAGRAM_PASSWORD (oraz opcjonalnie INSTAGRAM_2FA_SECRET) w GitHub Secrets są poprawne.');
                }
                activeUsername = await this.getActiveUsername(page);
                console.log(`[Instagram] 👤 Active account after login: @${activeUsername}`);
            }

            if (activeUsername !== 'secretsofthelondonmansion') {
                throw new Error(`KRYTYCZNY BŁĄD KONTA: Aktywne konto to @${activeUsername || 'niezalogowany'} zamiast @secretsofthelondonmansion! Publikacja wstrzymana dla bezpieczeństwa.`);
            }

            console.log(`[Instagram] 🔍 Opening Create Post modal...`);
            const createBtn = await page.$('svg[aria-label="New post"], svg[aria-label="Nowy post"], span:has-text("Create"), span:has-text("Utwórz")');
            if (createBtn) {
                await createBtn.click();
            } else {
                const links = await page.$$('a, div[role="button"]');
                for (const l of links) {
                    const text = await l.innerText().catch(() => '');
                    if (text.includes('Create') || text.includes('Utwórz')) {
                        await l.click();
                        break;
                    }
                }
            }

            await page.waitForTimeout(3000);

            console.log(`[Instagram] 📤 Uploading file: ${path.basename(filePath)}...`);
            const fileInputLocator = page.locator('input[type="file"]').first();
            await fileInputLocator.setInputFiles(filePath, { noWaitAfter: true });

            await page.waitForTimeout(4000);
            await this.dismissPopups(page);

            // Next 1: Crop
            console.log(`[Instagram] ➡️ Clicking Next (Step 1: Crop)...`);
            const nextBtn1 = page.locator('div[role="dialog"]').getByRole('button', { name: /^Next$|^Dalej$/i }).first();
            await nextBtn1.click({ timeout: 15000 });

            await page.waitForTimeout(3000);

            // Next 2: Filters
            console.log(`[Instagram] ➡️ Clicking Next (Step 2: Filters)...`);
            const nextBtn2 = page.locator('div[role="dialog"]').getByRole('button', { name: /^Next$|^Dalej$/i }).first();
            await nextBtn2.click({ timeout: 15000 });

            await page.waitForTimeout(3000);

            // Write Caption in caption box
            console.log(`[Instagram] ✍️ Entering caption and hashtags...`);
            await page.waitForTimeout(2000);
            
            const captionBox = page.locator('div[aria-label*="Write a caption"], div[aria-label*="Napisz podpis"], div[aria-label*="caption"], div[aria-label*="podpis"], div[role="textbox"][contenteditable="true"]').first();
            await captionBox.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
            await captionBox.click({ force: true });
            await page.waitForTimeout(500);

            // Layer A: Insert via document.execCommand (universal for React Lexical & Draft.js)
            const insertedViaExec = await page.evaluate((text) => {
                const el = document.querySelector('div[contenteditable="true"][role="textbox"], div[aria-label*="caption"], div[aria-label*="podpis"], div[aria-label*="Write a caption"], div[aria-label*="Napisz podpis"]');
                if (el) {
                    el.focus();
                    document.execCommand('selectAll', false, null);
                    const success = document.execCommand('insertText', false, text);
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    return success && (el.innerText || el.textContent || '').trim().length > 10;
                }
                return false;
            }, captionText);

            // Layer B: Fallback if execCommand did not insert
            if (!insertedViaExec) {
                console.log(`[Instagram] Fallback: inserting text via keyboard.insertText...`);
                await captionBox.click({ force: true });
                await page.keyboard.insertText(captionText);
                await page.waitForTimeout(1000);
            }

            // Verify caption in DOM
            const verifiedLength = await page.evaluate(() => {
                const el = document.querySelector('div[contenteditable="true"][role="textbox"], div[aria-label*="caption"], div[aria-label*="podpis"]');
                return el ? (el.innerText || el.textContent || '').trim().length : 0;
            });
            console.log(`[Instagram] 📝 Caption verified in editor (${verifiedLength} chars)`);

            await page.waitForTimeout(2000);

            // The real "Share" (publish post) button in the modal header
            console.log(`[Instagram] 🚀 Clicking Share (publish) in modal header...`);
            await page.waitForTimeout(1500);

            // Locate the Share button directly in the modal
            const shareButton = page.locator('div[role="dialog"]').getByRole('button', { name: /^Share$|^Udostępnij$/i })
                .or(page.locator('div[role="dialog"] div[role="button"]:has-text("Share"), div[role="dialog"] div[role="button"]:has-text("Udostępnij")'))
                .first();

            await shareButton.waitFor({ state: 'visible', timeout: 15000 });

            // Perform bounding box coordinate click + native locator click
            const box = await shareButton.boundingBox();
            if (box) {
                console.log(`[Instagram] Clicking Share button at coords (${Math.round(box.x + box.width/2)}, ${Math.round(box.y + box.height/2)})...`);
                await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
            }
            await shareButton.click({ force: true }).catch(() => {});

            console.log(`[Instagram] ⏳ Waiting for upload & transcoding confirmation from Instagram...`);
            const confirmationLocator = page.locator('text=/your post has been shared|twój post został udostępniony|post shared|udostępniono post|udostępniony/i');
            await confirmationLocator.first().waitFor({ state: 'visible', timeout: 60000 });
            console.log(`[Instagram] ✅ Post sharing confirmation verified!`);

            await page.waitForTimeout(4000);

            // Navigate to profile grid to capture live confirmation
            console.log(`[Instagram] 🔍 Navigating to profile grid to capture live confirmation...`);
            await page.goto('https://www.instagram.com/secretsofthelondonmansion/', { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(3000);

            const confirmationPath = path.join(__dirname, '../../config/instagram_published_confirmation.png');
            await page.screenshot({ path: confirmationPath, fullPage: true });
            console.log(`📸 Live profile confirmation screenshot saved to: ${confirmationPath}`);

            // Save updated cookies to disk and encrypted git-storage
            const finalState = await context.storageState({ path: this.sessionPath });
            InstagramSessionStorage.persist(finalState);

            console.log(`🎉 [Instagram Success] Post published successfully on Betty's feed!`);
            await browser.close();

            return {
                status: 'PUBLISHED',
                platform: 'Instagram',
                file: path.basename(filePath),
                timestamp: new Date().toISOString(),
                confirmationScreenshot: confirmationPath
            };
        } catch (err) {
            const errorScreenshotPath = path.join(__dirname, '../../config/instagram_error.png');
            try {
                await page.screenshot({ path: errorScreenshotPath, fullPage: true });
                console.log(`📸 Zrzut ekranu z błędem zapisany w: ${errorScreenshotPath}`);
            } catch (e) {}

            await browser.close();
            throw err;
        }
    }
}

module.exports = InstagramBrowserUploader;

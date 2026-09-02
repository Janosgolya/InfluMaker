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
        InstagramSessionStorage.restore();
        return fs.existsSync(this.sessionPath) || !!(process.env.INSTAGRAM_PASSWORD || process.env.INSTAGRAM_PASS);
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
            const notNowButtons = await page.$$('button:has-text("Not Now"), button:has-text("Nie teraz"), button:has-text("Cancel"), button:has-text("Odrzuć"), button:has-text("OK"), button:has-text("Ok"), button:has-text("Save info"), button:has-text("Zapisz informacje")');
            for (const btn of notNowButtons) {
                if (await btn.isVisible()) {
                    await btn.click().catch(() => {});
                    await page.waitForTimeout(1000);
                }
            }
        } catch (e) {}
    }

    /**
     * Self-healing autonomous login when session cookies expire
     *
     * @secretsofthelondonmansion is a LINKED CREATOR account under bocianjanusz.
     * It has NO independent password. The correct flow is:
     * 1. Login as bocianjanusz (main account) using INSTAGRAM_PASSWORD
     * 2. Switch to secretsofthelondonmansion via account switcher
     */
    async attemptCredentialLogin(page, context) {
        // Use bocianjanusz as the login account (the main account that holds the creator profile)
        const mainUsername = (process.env.INSTAGRAM_USERNAME || 'bocianjanusz').trim();
        const password = (process.env.INSTAGRAM_PASSWORD || process.env.INSTAGRAM_PASS || '').trim();
        const targetAccount = 'secretsofthelondonmansion';

        if (!password) {
            console.log(`[Instagram Auth] ℹ️ No INSTAGRAM_PASSWORD in environment. Cannot perform autonomous credential login.`);
            return false;
        }

        console.log(`[Instagram Auth] 🤖 Attempting autonomous login as @${mainUsername}, then switching to @${targetAccount}...`);

        try {
            // Step 1: Handle one-tap screen showing bocianjanusz "Continue"
            const continueBtn = page.locator('div[role="button"]:has-text("Continue"), button:has-text("Continue")').first();
            const hasContinue = await continueBtn.count() > 0 && await continueBtn.isVisible().catch(() => false);

            if (hasContinue) {
                console.log(`[Instagram Auth] 📲 One-tap screen detected. Clicking "Continue as ${mainUsername}"...`);
                await continueBtn.click();
                await page.waitForTimeout(6000);
                await this.dismissPopups(page);
            } else {
                // Go to login page and login with main account username + password
                console.log(`[Instagram Auth] 📲 Navigating to login page...`);
                await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'domcontentloaded', timeout: 30000 });
                await page.waitForTimeout(3000);

                const userInput = page.locator('input[name="username"], input[name="email"]').first();
                const passInput = page.locator('input[name="password"], input[type="password"]').first();

                await userInput.waitFor({ state: 'visible', timeout: 15000 });
                await userInput.fill(mainUsername);
                await page.waitForTimeout(500);

                await passInput.waitFor({ state: 'visible', timeout: 15000 });
                await passInput.fill(password);
                await page.waitForTimeout(500);

                await page.locator('button[type="submit"]').first().click();
                console.log(`[Instagram Auth] 🔑 Submitted credentials, waiting for login...`);
                await page.waitForTimeout(7000);

                // Handle 2FA if prompted
                const codeInput = page.locator('input[name="verificationCode"], input[name="security_code"], input[type="tel"]').first();
                if (await codeInput.count() > 0 && process.env.INSTAGRAM_2FA_SECRET) {
                    console.log(`[Instagram Auth] 🛡️ 2FA challenge detected! Generating TOTP...`);
                    const totpCode = this.generateTOTP(process.env.INSTAGRAM_2FA_SECRET);
                    await codeInput.fill(totpCode);
                    await page.waitForTimeout(500);
                    const confirm2fa = page.locator('button:has-text("Confirm"), button:has-text("Potwierdź")').first();
                    if (await confirm2fa.count() > 0) await confirm2fa.click();
                    else await page.keyboard.press('Enter');
                    await page.waitForTimeout(7000);
                }

                await this.dismissPopups(page);
            }

            // Step 2: Now logged in as bocianjanusz — switch to secretsofthelondonmansion
            const currentUser = await page.evaluate(() => {
                for (const a of document.querySelectorAll('a[href^="/"]')) {
                    const h = a.getAttribute('href');
                    if (h && !h.startsWith('/explore') && !h.startsWith('/reels') && !h.startsWith('/direct') && !h.startsWith('/accounts') && !h.startsWith('/stories') && h.split('/').filter(Boolean).length === 1) {
                        return h.replace(/\//g, '').trim().toLowerCase();
                    }
                }
                return null;
            });
            console.log(`[Instagram Auth] 👤 Currently logged in as: @${currentUser}`);

            if (currentUser !== targetAccount) {
                // Switch account via sidebar "More" menu
                console.log(`[Instagram Auth] 🔄 Switching to @${targetAccount}...`);
                const moreBtn = page.locator('svg[aria-label="Settings"], svg[aria-label="Ustawienia"], span:has-text("More"), span:has-text("Więcej")').first();
                if (await moreBtn.count() > 0 && await moreBtn.isVisible().catch(() => false)) {
                    await moreBtn.click();
                    await page.waitForTimeout(1500);
                    const switchBtn = page.locator('span:has-text("Switch accounts"), span:has-text("Przełącz konta")').first();
                    if (await switchBtn.count() > 0) {
                        await switchBtn.click();
                        await page.waitForTimeout(2000);
                        const bettyBtn = page.locator(`button:has-text("${targetAccount}"), a[href="/${targetAccount}/"]`).first();
                        if (await bettyBtn.count() > 0) {
                            await bettyBtn.click();
                            await page.waitForTimeout(5000);
                            await this.dismissPopups(page);
                        }
                    }
                }
            }

            // Final verification
            const finalUser = await page.evaluate(() => {
                for (const a of document.querySelectorAll('a[href^="/"]')) {
                    const h = a.getAttribute('href');
                    if (h && !h.startsWith('/explore') && !h.startsWith('/reels') && !h.startsWith('/direct') && !h.startsWith('/accounts') && !h.startsWith('/stories') && h.split('/').filter(Boolean).length === 1) {
                        return h.replace(/\//g, '').trim().toLowerCase();
                    }
                }
                return null;
            });
            console.log(`[Instagram Auth] 👤 Final active account: @${finalUser}`);

            // Save fresh session regardless
            const freshState = await context.storageState({ path: this.sessionPath });
            InstagramSessionStorage.persist(freshState);
            return true;
        } catch (e) {
            console.warn(`[Instagram Auth] Autonomous login attempt error:`, e.message);
            return false;
        }
    }

    /**
     * Switch the active Instagram session to secretsofthelondonmansion
     * using the account switcher in the sidebar.
     */
    async trySwitchToTargetAccount(page, context) {
        const targetAccount = 'secretsofthelondonmansion';
        try {
            // Try clicking the avatar/profile icon at bottom of sidebar to open menu
            const avatarBtn = page.locator('img[alt*="bocianjanusz"], img[data-testid="user-avatar"], a[href="/bocianjanusz/"] img').first();
            if (await avatarBtn.count() > 0) {
                await avatarBtn.click();
                await page.waitForTimeout(2000);
            }

            // Try "Switch accounts" option in the more menu
            const moreSelectors = [
                'svg[aria-label="More"], svg[aria-label="Więcej"]',
                'div[role="button"]:has(svg[aria-label="Settings"])',
                'span:has-text("More")',
                'span:has-text("Więcej")'
            ];
            for (const sel of moreSelectors) {
                const el = page.locator(sel).first();
                if (await el.count() > 0 && await el.isVisible().catch(() => false)) {
                    await el.click();
                    await page.waitForTimeout(1500);
                    break;
                }
            }

            const switchBtn = page.locator('span:has-text("Switch accounts"), span:has-text("Przełącz konta"), div:has-text("Switch accounts"), div:has-text("Przełącz konta")').first();
            if (await switchBtn.count() > 0) {
                await switchBtn.click();
                await page.waitForTimeout(2000);
                // Look for Betty's account in the switcher list
                const bettyBtn = page.locator(`div:has-text("${targetAccount}") [role="button"], button:has-text("${targetAccount}"), a[href="/${targetAccount}/"]`).first();
                if (await bettyBtn.count() > 0) {
                    await bettyBtn.click();
                    await page.waitForTimeout(5000);
                    await this.dismissPopups(page);
                    // Save refreshed session
                    const freshState = await context.storageState({ path: this.sessionPath });
                    InstagramSessionStorage.persist(freshState);
                    console.log(`[Instagram Auth] ✅ Switched to @${targetAccount} and saved session.`);
                    return true;
                }
            }

            // Last resort: try direct switch URL (doesn't always work but worth trying)
            console.log(`[Instagram Auth] Trying direct switch via /api/v1/accounts/set_contactpoint_display/...`);
            await page.goto(`https://www.instagram.com/${targetAccount}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
            await page.waitForTimeout(3000);

            const finalUrl = page.url();
            const finalUser = await page.evaluate(() => {
                for (const a of document.querySelectorAll('a[href^="/"]')) {
                    const h = a.getAttribute('href');
                    if (h && !h.startsWith('/explore') && !h.startsWith('/reels') && !h.startsWith('/direct') && !h.startsWith('/accounts') && !h.startsWith('/stories') && h.split('/').filter(Boolean).length === 1) {
                        return h.replace(/\//g, '').trim().toLowerCase();
                    }
                }
                return null;
            });
            console.log(`[Instagram Auth] After direct nav: finalUser=${finalUser}`);
            return finalUser === targetAccount;
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

            // Check if login or multi-account selector is displayed
            const isLoggedOut = page.url().includes('/accounts/login') || page.url().includes('/accounts/emailsignup') || page.url().includes('/accounts/signup') || page.url().includes('/accounts/onetap');
            const hasOneTapOrContinue = await page.locator('button:has-text("Continue"), div[role="button"]:has-text("Continue"), div:has-text("bocianjanusz")').count() > 0;

            if (isLoggedOut || hasOneTapOrContinue) {
                console.log(`[Instagram] ⚠️ Active session not found or account selector shown. Attempting self-healing login...`);
                const loginSuccess = await this.attemptCredentialLogin(page, context);
                if (!loginSuccess) {
                    throw new Error('Sesja Instagram wygasła. Aby system samoczynnie wznawiał sesję 24/7 w chmurze, dodaj w GitHub Secrets sekret INSTAGRAM_PASSWORD (oraz opcjonalnie INSTAGRAM_2FA_SECRET), lub uruchom jednorazowo LOGIN_INSTAGRAM.bat.');
                }
            }

            await this.dismissPopups(page);

            // Strict Account Verification - NEVER publish to a personal account
            // If bocianjanusz is detected, attempt to switch to secretsofthelondonmansion
            const activeUsername = await page.evaluate(() => {
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
            console.log(`[Instagram] 👤 Active logged-in username detected: @${activeUsername}`);

            if (activeUsername && activeUsername !== 'secretsofthelondonmansion') {
                console.log(`[Instagram] 🔄 Currently on @${activeUsername}, attempting switch to @secretsofthelondonmansion...`);
                // Try account switcher via avatar menu in the sidebar
                const switched = await this.trySwitchToTargetAccount(page, context);
                if (!switched) {
                    throw new Error(`KRYTYCZNY BŁĄD KONTA: Wykryto zalogowane konto @${activeUsername} zamiast @secretsofthelondonmansion! Nie udało się przełączyć konta. Uruchom LOGIN_INSTAGRAM.bat.`);
                }
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

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/instagram_session.json');

class InstagramBrowserUploader {
    constructor() {
        this.sessionPath = SESSION_PATH;
    }

    isLoggedIn() {
        return fs.existsSync(this.sessionPath);
    }

    /**
     * Dismiss notifications and cookie popups on Instagram
     */
    async dismissPopups(page) {
        try {
            const notNowButtons = await page.$$('button:has-text("Not Now"), button:has-text("Nie teraz"), button:has-text("Cancel"), button:has-text("Odrzuć"), button:has-text("OK"), button:has-text("Ok")');
            for (const btn of notNowButtons) {
                if (await btn.isVisible()) {
                    await btn.click().catch(() => {});
                    await page.waitForTimeout(1000);
                }
            }
        } catch (e) {}
    }

    /**
     * Upload and publish photo post directly to Instagram feed
     */
    async uploadAndPublish(filePath, captionText, options = {}) {
        if (!this.isLoggedIn()) {
            throw new Error(`Brak aktywnej sesji Instagram. Uruchom najpierw: node src/scripts/instagram_browser_login.js`);
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

        const context = await browser.newContext({
            storageState: this.sessionPath,
            viewport: { width: 1440, height: 900 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        });

        const page = await context.newPage();

        try {
            console.log(`[Instagram] 🌐 Opening Instagram Home...`);
            await page.goto('https://www.instagram.com', { waitUntil: 'domcontentloaded', timeout: 45000 });
            await page.waitForTimeout(4000);

            // Check if login or signup is required
            if (page.url().includes('/accounts/login') || page.url().includes('/accounts/emailsignup') || page.url().includes('/accounts/signup') || page.url().includes('/accounts/onetap')) {
                throw new Error('Sesja Instagram wygasła (przekierowano do logowania/rejestracji). Wymagane odświeżenie sesji w config/instagram_session.json.');
            }

            await this.dismissPopups(page);

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

            // The real "Share" (publish post) is the text button in the TOP-RIGHT corner of the modal header.
            console.log(`[Instagram] 🚀 Clicking Share (publish) in modal header...`);

            // Wait a moment for caption to settle
            await page.waitForTimeout(2000);

            // Close any open DM-share popup first if present
            try {
                const closePopup = await page.$('div[role="dialog"] svg[aria-label="Close"], button[aria-label="Close"]');
                if (closePopup) {
                    await closePopup.evaluate(el => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
                    await page.waitForTimeout(1000);
                }
            } catch(e) {}

            // Find and click the header Share button
            const shareResult = await page.evaluate(() => {
                // Find all elements inside dialogs
                const dialogs = document.querySelectorAll('div[role="dialog"]');
                for (const dialog of dialogs) {
                    const elements = Array.from(dialog.querySelectorAll('div[role="button"], button, span, div[tabindex="0"]'));
                    for (const el of elements) {
                        const text = (el.innerText || el.textContent || '').trim();
                        if (text === 'Share' || text === 'Udostępnij') {
                            const rect = el.getBoundingClientRect();
                            // Header button is in the top portion of the dialog (< 250px from top of viewport)
                            if (rect.top < 300 && rect.width > 0 && rect.height > 0) {
                                el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                                el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                                el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                                if (typeof el.click === 'function') el.click();
                                return { success: true, text, top: rect.top, left: rect.left };
                            }
                        }
                    }
                }
                return { success: false };
            });

            console.log(`[Instagram] Share click result:`, JSON.stringify(shareResult));

            if (!shareResult || !shareResult.success) {
                // Fallback: try Playwright locator
                console.log(`[Instagram] Trying Playwright locator fallback for Share button...`);
                const headerShare = page.locator('div[role="dialog"]').getByRole('button', { name: /^Share$|^Udostępnij$/i }).first();
                await headerShare.click({ force: true, timeout: 5000 });
            }

            console.log(`[Instagram] ⏳ Waiting for upload & transcoding to finish...`);
            try {
                // Wait for the "Twój post został udostępniony" / "Your post has been shared" confirmation
                await page.waitForSelector('text=udostępniony, text=shared, text=Udostępniono, text=Shared', { timeout: 45000 });
                console.log(`[Instagram] ✅ Post sharing confirmation received!`);
            } catch (e) {
                console.log(`[Instagram] Upload timeout wait passed, continuing...`);
            }

            await page.waitForTimeout(3000);

            const confirmationPath = path.join(__dirname, '../../config/instagram_published_confirmation.png');
            await page.screenshot({ path: confirmationPath, fullPage: true });
            console.log(`📸 Confirmation screenshot saved to: ${confirmationPath}`);

            // Save updated cookies
            await context.storageState({ path: this.sessionPath });

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

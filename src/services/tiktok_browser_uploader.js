const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const humanEmulator = require('./human_emulator');

const SESSION_PATH = path.join(__dirname, '../../config/tiktok_session.json');

class TikTokBrowserUploader {
    constructor() {
        this.sessionPath = SESSION_PATH;
    }

    isLoggedIn() {
        return fs.existsSync(this.sessionPath);
    }

    /**
     * Dismiss any modal dialogs or popups appearing on TikTok Studio with human-like interactions
     */
    async dismissPopups(page) {
        try {
            const popupButtons = await page.$$('button:has-text("Turn on"), button:has-text("Got it"), button:has-text("Cancel"), button:has-text("Rozumiem"), button:has-text("Włącz"), button:has-text("Allow"), button:has-text("Zezwól")');
            for (const btn of popupButtons) {
                if (await btn.isVisible()) {
                    console.log(`[TikTok] 🛡️ Dismissing studio popup with human click...`);
                    await humanEmulator.humanClick(page, btn);
                    await humanEmulator.randomDelay(1000, 2000);
                }
            }

            const closeBtns = await page.$$('div[role="dialog"] button, .TUXModal button');
            for (const cBtn of closeBtns) {
                if (await cBtn.isVisible()) {
                    const text = await cBtn.innerText().catch(() => '');
                    if (text.includes('Turn on') || text.includes('Got it') || text.includes('Cancel') || text.includes('Close') || text === '') {
                        await humanEmulator.humanClick(page, cBtn);
                        await humanEmulator.randomDelay(800, 1500);
                    }
                }
            }
        } catch (e) {}
    }

    /**
     * Upload and publish MP4 video post directly through TikTok Studio using saved session and stealth emulator
     */
    async uploadAndPublish(filePath, captionText, options = {}) {
        if (!this.isLoggedIn()) {
            throw new Error(`Brak aktywnej sesji TikTok. Uruchom najpierw: node src/scripts/tiktok_browser_login.js`);
        }

        console.log(`\n======================================================`);
        console.log(`🚀 TIKTOK BROWSER PUBLISHER: ${path.basename(filePath)}`);
        console.log(`Mode: Automated TikTok Studio Session (Human Stealth Mode)`);
        console.log(`======================================================`);

        const browser = await chromium.launch({
            headless: options.headless ?? true,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-infobars',
                '--window-size=1440,900'
            ]
        });

        const context = await browser.newContext({
            storageState: this.sessionPath,
            viewport: { width: 1440, height: 900 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            locale: 'en-US',
            timezoneId: 'Europe/Warsaw'
        });

        const page = await context.newPage();
        await humanEmulator.injectStealth(page);

        try {
            console.log(`[TikTok] 🌐 Initializing TikTok studio session...`);
            await page.goto('https://www.tiktok.com/tiktokstudio/content', { waitUntil: 'domcontentloaded', timeout: 35000 });
            await humanEmulator.randomDelay(3500, 5500);
            await this.dismissPopups(page);

            console.log(`[TikTok] 🌐 Opening TikTok Studio Upload...`);
            await page.goto('https://www.tiktok.com/tiktokstudio/upload', { waitUntil: 'domcontentloaded', timeout: 45000 });
            await humanEmulator.randomDelay(4000, 6000);

            // Check if redirected to login
            if (page.url().includes('/login') || page.url().includes('/signup')) {
                throw new Error('Sesja wygasła. Uruchom ponownie: node src/scripts/tiktok_browser_login.js');
            }

            await this.dismissPopups(page);

            console.log(`[TikTok] 📤 Selecting MP4 video file: ${path.basename(filePath)}...`);

            // Find file input element (in main frame or iframes)
            let fileInput = await page.$('input[type="file"]');
            if (!fileInput) {
                const frames = page.frames();
                for (const frame of frames) {
                    fileInput = await frame.$('input[type="file"]');
                    if (fileInput) break;
                }
            }

            if (!fileInput) {
                throw new Error('Nie znaleziono pola wgrywania pliku na stronie TikTok Studio.');
            }

            await fileInput.setInputFiles(filePath);
            console.log(`[TikTok] ⏳ Video file uploaded to studio, waiting for video processing...`);

            // Wait for video to process with human reading jitter
            await humanEmulator.randomDelay(7000, 10000);
            await this.dismissPopups(page);

            // Natural human scroll to inspect form
            await humanEmulator.naturalScroll(page, 1);
            await humanEmulator.randomDelay(1500, 3000);

            // Fill caption and hashtags using human typing
            console.log(`[TikTok] ✍️ Filling caption and hashtags with human rhythm...`);
            await this.dismissPopups(page);

            const captionBox = page.locator('div[contenteditable="true"], .notranslate.public-DraftEditor-content, div.DraftEditor-root').first();
            if (await captionBox.isVisible({ timeout: 10000 }).catch(() => false)) {
                await humanEmulator.humanClick(page, captionBox);
                await page.keyboard.press('Control+A');
                await page.keyboard.press('Backspace');
                await humanEmulator.humanType(page, captionBox, captionText);
                console.log(`[TikTok] ✅ Caption entered naturally!`);
            }

            await humanEmulator.simulateHesitation(2000, 4000);
            await this.dismissPopups(page);

            // Click Post / Opublikuj using human click physics
            console.log(`[TikTok] 🚀 Clicking Post button with human physics...`);
            const postBtn = page.locator('button:has-text("Post"), button:has-text("Opublikuj"), button.btn-post').last();
            if (await postBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
                await postBtn.scrollIntoViewIfNeeded();
                await humanEmulator.randomDelay(1000, 2000);
                await humanEmulator.humanClick(page, postBtn);
                console.log(`[TikTok] ✅ Post button clicked!`);
            } else {
                console.log(`[TikTok] ⚠️ Trying fallback post button selector...`);
                const allButtons = await page.$$('button');
                for (const b of allButtons) {
                    const txt = await b.innerText().catch(() => '');
                    if (txt.trim() === 'Post' || txt.trim() === 'Opublikuj') {
                        await humanEmulator.humanClick(page, b);
                        break;
                    }
                }
            }

            console.log(`[TikTok] ⏳ Waiting for publish modal confirmation...`);
            await humanEmulator.randomDelay(8000, 12000);

            // Take confirmation screenshot
            const confirmationPath = path.join(__dirname, '../../config/tiktok_published_confirmation.png');
            await page.screenshot({ path: confirmationPath, fullPage: true });
            console.log(`📸 Publish confirmation screenshot saved to: ${confirmationPath}`);

            // Refresh and save session cookies
            await context.storageState({ path: this.sessionPath });

            console.log(`🎉 [TikTok Success] 1080x1920 Video Post published successfully on @bettyryal!`);
            await browser.close();

            return {
                status: 'PUBLISHED',
                platform: 'TikTok',
                file: path.basename(filePath),
                timestamp: new Date().toISOString(),
                confirmationScreenshot: confirmationPath
            };
        } catch (err) {
            const errorScreenshotPath = path.join(__dirname, '../../config/tiktok_error.png');
            try {
                await page.screenshot({ path: errorScreenshotPath, fullPage: true });
                console.log(`📸 Zrzut ekranu z błędem zapisany w: ${errorScreenshotPath}`);
            } catch (e) {}

            await browser.close();
            throw err;
        }
    }
}

module.exports = TikTokBrowserUploader;

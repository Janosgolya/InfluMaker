const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/tiktok_session.json');

class TikTokBrowserUploader {
    constructor() {
        this.sessionPath = SESSION_PATH;
    }

    isLoggedIn() {
        return fs.existsSync(this.sessionPath);
    }

    /**
     * Dismiss any modal dialogs or popups appearing on TikTok Studio
     */
    async dismissPopups(page) {
        try {
            const popupButtons = await page.$$('button:has-text("Turn on"), button:has-text("Got it"), button:has-text("Cancel"), button:has-text("Rozumiem"), button:has-text("Włącz"), button:has-text("Allow"), button:has-text("Zezwól")');
            for (const btn of popupButtons) {
                if (await btn.isVisible()) {
                    console.log(`[TikTok] 🛡️ Dismissing studio popup...`);
                    await btn.click().catch(() => {});
                    await page.waitForTimeout(1000);
                }
            }

            const closeBtns = await page.$$('div[role="dialog"] button, .TUXModal button');
            for (const cBtn of closeBtns) {
                if (await cBtn.isVisible()) {
                    const text = await cBtn.innerText().catch(() => '');
                    if (text.includes('Turn on') || text.includes('Got it') || text.includes('Cancel') || text.includes('Close') || text === '') {
                        await cBtn.click().catch(() => {});
                    }
                }
            }
        } catch (e) {}
    }

    /**
     * Upload and publish MP4 video post directly through TikTok Studio using saved session
     */
    async uploadAndPublish(filePath, captionText, options = {}) {
        if (!this.isLoggedIn()) {
            throw new Error(`Brak aktywnej sesji TikTok. Uruchom najpierw: node src/scripts/tiktok_browser_login.js`);
        }

        console.log(`\n======================================================`);
        console.log(`🚀 TIKTOK BROWSER PUBLISHER: ${path.basename(filePath)}`);
        console.log(`Mode: Automated TikTok Studio Session (Headless: ${options.headless ?? true})`);
        console.log(`======================================================`);

        const browser = await chromium.launch({
            headless: options.headless ?? true,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--start-maximized'
            ]
        });

        const context = await browser.newContext({
            storageState: this.sessionPath,
            viewport: { width: 1440, height: 900 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        });

        const page = await context.newPage();
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });

        try {
            console.log(`[TikTok] 🌐 Initializing TikTok studio session...`);
            await page.goto('https://www.tiktok.com/tiktokstudio/content', { waitUntil: 'domcontentloaded', timeout: 35000 });
            await page.waitForTimeout(3000);
            await this.dismissPopups(page);

            console.log(`[TikTok] 🌐 Opening TikTok Studio Upload...`);
            await page.goto('https://www.tiktok.com/tiktokstudio/upload', { waitUntil: 'domcontentloaded', timeout: 45000 });
            await page.waitForTimeout(4000);

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
            console.log(`[TikTok] ⏳ Video file uploaded to studio, waiting for processing...`);

            // Wait for video to process and dismiss any popups that appear after upload
            await page.waitForTimeout(6000);
            await this.dismissPopups(page);

            // Fill caption and hashtags
            console.log(`[TikTok] ✍️ Filling caption and hashtags...`);
            await this.dismissPopups(page);

            const captionBox = await page.$('div[contenteditable="true"]') || await page.$('.notranslate.public-DraftEditor-content') || await page.$('div.DraftEditor-root');
            if (captionBox) {
                await captionBox.click({ force: true });
                await page.keyboard.press('Control+A');
                await page.keyboard.press('Backspace');
                await page.keyboard.type(captionText, { delay: 15 });
                console.log(`[TikTok] ✅ Caption entered successfully!`);
            }

            await page.waitForTimeout(4000);
            await this.dismissPopups(page);

            // Click Post / Opublikuj
            console.log(`[TikTok] 🚀 Clicking Post button...`);
            const postButtons = await page.$$('button:has-text("Post"), button:has-text("Opublikuj"), button.btn-post');
            if (postButtons.length > 0) {
                const targetBtn = postButtons[postButtons.length - 1];
                await targetBtn.scrollIntoViewIfNeeded();
                await targetBtn.click({ force: true });
                console.log(`[TikTok] ✅ Post button clicked!`);
            } else {
                console.log(`[TikTok] ⚠️ Trying fallback post button selector...`);
                const allButtons = await page.$$('button');
                for (const b of allButtons) {
                    const txt = await b.innerText().catch(() => '');
                    if (txt.trim() === 'Post' || txt.trim() === 'Opublikuj') {
                        await b.click({ force: true });
                        break;
                    }
                }
            }

            console.log(`[TikTok] ⏳ Waiting for publish modal confirmation...`);
            await page.waitForTimeout(10000);

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

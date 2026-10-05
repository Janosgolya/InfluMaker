const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
    const sessionPath = path.resolve(__dirname, '../../config/tiktok_session.json');
    console.log('Using TikTok session:', sessionPath);
    if (!fs.existsSync(sessionPath)) {
        console.error('Session file not found!');
        return;
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        storageState: sessionPath,
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    try {
        console.log('Navigating to TikTok Studio Content...');
        await page.goto('https://www.tiktok.com/tiktokstudio/content', { waitUntil: 'domcontentloaded', timeout: 40000 });
        await page.waitForTimeout(6000);
        await page.screenshot({ path: path.resolve(__dirname, '../../config/tiktok_studio_check_live.png'), fullPage: true });
        console.log('Saved screenshot to config/tiktok_studio_check_live.png');
        console.log('Current URL:', page.url());

        // Check if there are notification or ban banners on Studio
        const bannerText = await page.evaluate(() => {
            const banners = Array.from(document.querySelectorAll('[class*="banner"], [class*="alert"], [class*="notice"], [role="alert"], [class*="warning"], [class*="tip"]'));
            return banners.map(b => b.innerText.trim()).filter(t => t.length > 0);
        });
        console.log('Studio Banners:', bannerText);

        // Check Account Standing / Notifications if available
        console.log('Checking notifications / messages...');
        await page.goto('https://www.tiktok.com/notifications', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(5000);
        await page.screenshot({ path: path.resolve(__dirname, '../../config/tiktok_notifications_live.png'), fullPage: true }).catch(() => {});

        const notifs = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('[data-e2e="notification-item"], [class*="notification"], [class*="notice"]'));
            return items.slice(0, 15).map(i => i.innerText.trim()).filter(t => t.length > 0);
        });
        console.log('Notifications found:', notifs);

        // Also check TikTok Studio upload page for restriction messages
        console.log('Checking upload page for restrictions...');
        await page.goto('https://www.tiktok.com/tiktokstudio/upload', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(5000);
        await page.screenshot({ path: path.resolve(__dirname, '../../config/tiktok_upload_check_live.png'), fullPage: true }).catch(() => {});

        const uploadAlerts = await page.evaluate(() => {
            const alerts = Array.from(document.querySelectorAll('[class*="alert"], [class*="modal"], [class*="warn"], [class*="error"], [class*="dialog"], [class*="toast"]'));
            return alerts.map(a => a.innerText.trim()).filter(t => t.length > 0);
        });
        console.log('Upload page alerts:', uploadAlerts);

    } catch (e) {
        console.error('Error during TikTok check:', e.message);
    } finally {
        await browser.close();
    }
})();

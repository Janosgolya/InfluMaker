const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/instagram_session.json');

async function submitBio() {
    console.log(`\n======================================================`);
    console.log(`📝 Submitting Bio to Instagram`);
    console.log(`======================================================`);

    const browser = await chromium.launch({
        headless: false,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--start-maximized',
            '--enable-webgl'
        ]
    });

    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    try {
        await page.goto('https://www.instagram.com/accounts/edit/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);

        const bioContent = `Maid in an 18th-century London manor 🕯️\nCandlelight diary & whispered secrets 📜\nUncensored room 👇\nfanvue.com/bettyryal`;

        console.log(`Writing bio...`);
        const textarea = page.locator('textarea').first();
        await textarea.click();
        await textarea.fill('');
        await page.waitForTimeout(300);
        await textarea.fill(bioContent);
        await page.waitForTimeout(1000);

        // Click "Prześlij"
        console.log(`Clicking 'Prześlij' button...`);
        const submitBtn = page.locator('div[role="button"], button').filter({ hasText: /^Prześlij$|^Submit$/i }).first();
        await submitBtn.click({ force: true });
        console.log(`Clicked 'Prześlij'!`);
        await page.waitForTimeout(5000);

        // Go to profile page
        console.log(`Navigating to profile to verify...`);
        await page.goto('https://www.instagram.com/secretsofthelondonmansion/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);

        const profilePath = path.join(__dirname, '../../config/instagram_profile_final.png');
        await page.screenshot({ path: profilePath, fullPage: true });
        console.log(`Final profile screenshot saved to: ${profilePath}`);

        await context.storageState({ path: SESSION_PATH });

    } catch (e) {
        console.error(`Error:`, e.message);
    } finally {
        await browser.close();
    }
}

submitBio();

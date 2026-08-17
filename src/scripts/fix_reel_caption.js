const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/instagram_session.json');

async function fixReelCaption() {
    console.log(`\n======================================================`);
    console.log(`🔧 FIXING INSTAGRAM REEL CAPTION`);
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
        await page.goto('https://www.instagram.com/secretsofthelondonmansion/reels/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);

        const reelLink = page.locator('a[href*="/reel/"], a[href*="/p/"]').first();
        const reelUrl = await reelLink.getAttribute('href');
        console.log(`Opening Reel: ${reelUrl}`);

        await page.goto(`https://www.instagram.com${reelUrl}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);

        // Click 3 dots menu
        console.log(`Clicking 3 dots...`);
        const dots = page.locator('svg[aria-label="Więcej opcji"], svg[aria-label="More options"]').first();
        await dots.click({ force: true });
        await page.waitForTimeout(2000);

        // Click "Edytuj"
        console.log(`Clicking 'Edytuj'...`);
        const editOption = page.locator('div, button, span').filter({ hasText: /^Edytuj$|^Edit$/i }).first();
        await editOption.click({ force: true });
        await page.waitForTimeout(3000);

        const properCaption = `Behind closed velvet curtains at 2 AM... 🕯️\n\nA maid hears everything, sees everything, and keeps the manor's deepest secrets locked in her diary.\n\nRead tonight's full uncensored confession in my bio link 🗝️\n.\n.\n.\n#HistoricalRomance #PeriodDrama #18thCentury #FineArtAesthetic #CandlelightChronicles #BettyRyal #LondonMansion`;

        // Find contenteditable inside dialog
        console.log(`Targeting caption editor inside modal...`);
        const captionBox = page.locator('div[role="dialog"]').locator('div[contenteditable="true"]').first();
        await captionBox.click({ force: true });
        await captionBox.fill('');
        await page.waitForTimeout(300);
        await page.keyboard.type(properCaption, { delay: 10 });
        await page.waitForTimeout(1500);

        // Click "Gotowe" in top right of modal
        console.log(`Clicking 'Gotowe'...`);
        const doneBtn = page.locator('div[role="dialog"]').locator('div[role="button"], button, span').filter({ hasText: /^Gotowe$|^Done$|^Zapisz$/i }).first();
        await doneBtn.click({ force: true });
        await page.waitForTimeout(5000);

        // Re-check Reel to verify caption
        console.log(`Re-opening Reel to verify caption...`);
        await page.goto(`https://www.instagram.com${reelUrl}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);

        const verifiedPath = path.join(__dirname, '../../config/reel_caption_fixed_verified.png');
        await page.screenshot({ path: verifiedPath, fullPage: true });
        console.log(`Verification screenshot saved to: ${verifiedPath}`);

        await context.storageState({ path: SESSION_PATH });

    } catch (e) {
        console.error(`Error:`, e.message);
    } finally {
        await browser.close();
    }
}

fixReelCaption();

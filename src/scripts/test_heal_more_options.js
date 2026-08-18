const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/instagram_session.json');

const caption1 = `The morning chill in the stone corridors... 🕯️

Before the manor stirs, I gather the linens by candlelight and listen to the quiet whispers of the great house. A quiet hour before the master rings the bell.

Discover the rest of my private diary via the link in my bio 🗝️
.
.
.
#18thCentury #PeriodRomance #FineArtPortrait #RembrandtLighting #BettyRyal #HistoricalFiction #LondonManor #VintageAesthetic`;

async function healPost(url) {
    console.log(`\n======================================================`);
    console.log(`✍️ HEALING INSTAGRAM POST: ${url}`);
    console.log(`======================================================`);

    const browser = await chromium.launch({
        headless: true,
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1440, height: 900 }
    });

    const page = await context.newPage();

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(4000);

        console.log(`🔍 Clicking More options SVG...`);
        const moreOptionsSvg = page.locator('svg[aria-label="More options"], svg[aria-label="Więcej opcji"]').first();
        await moreOptionsSvg.click({ force: true, timeout: 10000 });
        console.log(`✅ Clicked More options!`);

        await page.waitForTimeout(2000);

        // Find Edit / Edytuj button in dialog
        console.log(`🔍 Finding Edit button...`);
        const editBtn = page.locator('div[role="dialog"] button, div[role="dialog"] div[role="button"]').filter({ hasText: /^Edit$|^Edytuj$/i }).first();
        await editBtn.click({ force: true, timeout: 8000 });
        console.log(`✅ Clicked Edit button!`);

        await page.waitForTimeout(2500);

        // Find textarea or contenteditable editor in edit dialog
        console.log(`✍️ Entering caption into contenteditable...`);
        const editor = page.locator('div[role="dialog"] div[contenteditable="true"], div[role="dialog"] textarea').first();
        await editor.click({ force: true });
        await page.waitForTimeout(500);

        await page.evaluate((text) => {
            const el = document.querySelector('div[role="dialog"] div[contenteditable="true"], div[role="dialog"] textarea');
            if (el) {
                el.focus();
                document.execCommand('selectAll', false, null);
                document.execCommand('insertText', false, text);
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }, caption1);

        await page.waitForTimeout(1500);

        // Click Done / Gotowe / Zapisz
        console.log(`💾 Clicking Done...`);
        const doneBtn = page.locator('div[role="dialog"]').locator('div[role="button"], button, span').filter({ hasText: /^Done$|^Gotowe$|^Zapisz$/i }).first();
        await doneBtn.click({ force: true });
        console.log(`⏳ Waiting for save...`);
        await page.waitForTimeout(5000);

        console.log(`🎉 Success! Caption saved for ${url}!`);
    } catch (e) {
        console.error(`❌ Error healing ${url}:`, e.message);
    } finally {
        await browser.close();
    }
}

async function main() {
    await healPost('https://www.instagram.com/secretsofthelondonmansion/p/DcLaD3cCMUR/');
    await healPost('https://www.instagram.com/secretsofthelondonmansion/p/DcLYq39nOqS/');
}

main().catch(console.error);

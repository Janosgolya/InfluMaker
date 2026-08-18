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

async function editInstagramPost(postUrl, newCaption) {
    console.log(`\n======================================================`);
    console.log(`✍️ HEALING INSTAGRAM POST: ${postUrl}`);
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
        console.log(`🌐 Opening post: ${postUrl}...`);
        await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(4000);

        // Find the 3 dots button
        console.log(`🔍 Finding 3-dots menu button...`);
        const dotsLocator = page.locator('article header div[role="button"], article header svg[aria-label*="opcj"], article header svg[aria-label*="option"], article svg[aria-label*="opcj"], article svg[aria-label*="option"]').first();
        
        await dotsLocator.click({ force: true, timeout: 8000 });
        console.log(`🔘 Clicked 3-dots menu.`);
        await page.waitForTimeout(2000);

        // Take a screenshot of the open menu
        await page.screenshot({ path: path.join(__dirname, '../../config/insta_menu_screenshot.png') });

        // Find "Edytuj" or "Edit" button
        console.log(`🔍 Looking for Edit button in modal...`);
        const editBtn = page.locator('div[role="dialog"] button, div[role="dialog"] div[role="button"]').filter({ hasText: /^Edytuj$|^Edit$/i }).first();
        
        if (await editBtn.isVisible({ timeout: 5000 })) {
            await editBtn.click({ force: true });
            console.log(`✏️ Clicked Edit button.`);
            await page.waitForTimeout(3000);

            // Find caption editor
            console.log(`✍️ Inserting caption into editor...`);
            const editor = page.locator('div[role="dialog"] div[contenteditable="true"], div[role="dialog"] textarea').first();
            await editor.waitFor({ state: 'visible', timeout: 10000 });
            await editor.click({ force: true });
            await page.waitForTimeout(500);

            // Insert text
            await page.evaluate((text) => {
                const el = document.querySelector('div[role="dialog"] div[contenteditable="true"], div[role="dialog"] textarea');
                if (el) {
                    el.focus();
                    document.execCommand('selectAll', false, null);
                    document.execCommand('insertText', false, text);
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }, newCaption);

            await page.waitForTimeout(1500);

            // Click Done / Gotowe
            console.log(`💾 Clicking Done/Gotowe to save...`);
            const doneBtn = page.locator('div[role="dialog"]').locator('div[role="button"], button, span').filter({ hasText: /^Gotowe$|^Done$|^Zapisz$/i }).first();
            await doneBtn.click({ force: true });
            console.log(`⏳ Waiting for save completion...`);
            await page.waitForTimeout(4000);

            await page.screenshot({ path: path.join(__dirname, '../../config/insta_saved_screenshot.png') });
            console.log(`🎉 Post successfully healed & saved!`);
        } else {
            console.log(`❌ Edit button not found in dialog.`);
        }
    } catch (e) {
        console.error(`❌ Error editing post:`, e.message);
    } finally {
        await browser.close();
    }
}

async function run() {
    await editInstagramPost('https://www.instagram.com/secretsofthelondonmansion/p/DcLaD3cCMUR/', caption1);
    await editInstagramPost('https://www.instagram.com/secretsofthelondonmansion/p/DcLYq39nOqS/', caption1);
}

run().catch(console.error);

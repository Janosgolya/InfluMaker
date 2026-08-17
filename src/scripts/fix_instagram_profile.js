const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/instagram_session.json');

async function fixProfileAndCleanPosts() {
    console.log(`\n======================================================`);
    console.log(`🧹 STEP 1: Deleting Captionless Duplicate Post`);
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
        console.log(`🌐 Navigating to captionless post: https://www.instagram.com/secretsofthelondonmansion/p/DcJQsrnCCmh/ ...`);
        await page.goto('https://www.instagram.com/secretsofthelondonmansion/p/DcJQsrnCCmh/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);

        // Click 3 dots menu
        console.log(`Clicking three dots menu...`);
        const dotsSvg = page.locator('svg[aria-label="Więcej opcji"], svg[aria-label="More options"]').first();
        await dotsSvg.click({ force: true });
        await page.waitForTimeout(2000);

        // Click "Usuń" from menu
        console.log(`Clicking 'Usuń' in dropdown menu...`);
        const deleteItem = page.locator('div, button, span').filter({ hasText: /^Usuń$|^Delete$/i }).first();
        await deleteItem.click({ force: true });
        await page.waitForTimeout(2000);

        await page.screenshot({ path: path.join(__dirname, '../../config/delete_dialog_opened.png') });

        // Click confirmation "Usuń" inside modal dialog
        console.log(`Confirming deletion in popup dialog...`);
        const confirmDelete = page.locator('div[role="dialog"]').locator('button, div[role="button"]').filter({ hasText: /^Usuń$|^Delete$/i }).first();
        await confirmDelete.click({ force: true });
        console.log(`✅ Post deleted successfully!`);
        await page.waitForTimeout(4000);

        console.log(`\n======================================================`);
        console.log(`📝 STEP 2: Updating Bio & Profile Details`);
        console.log(`======================================================`);

        await page.goto('https://www.instagram.com/accounts/edit/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);

        const bioContent = `Maid in an 18th-century London manor 🕯️\nCandlelight diary & whispered secrets 📜\nUncensored room 👇\nfanvue.com/bettyryal`;

        console.log(`Writing bio (${bioContent.length} chars): \n${bioContent}`);

        // Find the Biogram textarea
        const bioTextarea = page.locator('textarea').first();
        await bioTextarea.click();
        await bioTextarea.fill('');
        await page.waitForTimeout(300);
        await bioTextarea.fill(bioContent);
        await page.waitForTimeout(1000);

        // Click "Wyślij" / "Submit" button
        console.log(`Submitting profile changes...`);
        const submitButton = page.locator('div[role="button"]:has-text("Wyślij"), button:has-text("Wyślij"), div[role="button"]:has-text("Submit"), button:has-text("Submit")').first();
        await submitButton.click({ force: true });
        await page.waitForTimeout(5000);

        // Verify on profile page
        console.log(`\n======================================================`);
        console.log(`📸 STEP 3: Verifying Final Clean Profile`);
        console.log(`======================================================`);

        await page.goto('https://www.instagram.com/secretsofthelondonmansion/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);

        const finalScreenshot = path.join(__dirname, '../../config/instagram_profile_perfect.png');
        await page.screenshot({ path: finalScreenshot, fullPage: true });
        console.log(`Saved perfect profile screenshot to: ${finalScreenshot}`);

        await context.storageState({ path: SESSION_PATH });
        console.log(`Updated session saved.`);

    } catch (e) {
        console.error(`Error:`, e.message);
        await page.screenshot({ path: path.join(__dirname, '../../config/fix_error.png') });
    } finally {
        await browser.close();
    }
}

fixProfileAndCleanPosts();

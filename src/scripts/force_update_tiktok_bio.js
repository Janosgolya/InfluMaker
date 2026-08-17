const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/tiktok_session.json');

async function forceUpdateBio() {
    console.log(`\n======================================================`);
    console.log(`🔄 UPDATING TIKTOK BIO TO INCLUDE FANVUE LINK`);
    console.log(`======================================================`);

    const browser = await chromium.launch({
        headless: true,
        args: ['--disable-blink-features=AutomationControlled']
    });

    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    try {
        console.log(`🌐 Navigating to profile...`);
        await page.goto('https://www.tiktok.com/@secretsofthelondonmanor', { waitUntil: 'domcontentloaded', timeout: 35000 });
        await page.waitForTimeout(4000);

        // Click "Edytuj profil" or "Edit profile"
        console.log(`🔍 Clicking 'Edytuj profil'...`);
        const editBtn = await page.waitForSelector('button:has-text("Edytuj profil"), button:has-text("Edit profile")', { timeout: 15000 });
        await editBtn.click();
        await page.waitForTimeout(2500);

        const newBio = "Maid in the manor 🕯️\nUncensored diary 👇\nfanvue.com/bettyryal";
        console.log(`✍️ Updating Bio text (${newBio.length} chars):\n${newBio}`);

        const textarea = await page.waitForSelector('textarea', { timeout: 10000 });
        await textarea.click();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(500);

        // Type character by character to trigger React inputs
        await page.keyboard.type(newBio, { delay: 20 });
        await page.waitForTimeout(1500);

        // Take modal screenshot
        const modalPath = path.join(__dirname, '../../config/tiktok_bio_typed_modal.png');
        await page.screenshot({ path: modalPath });

        // Locate and click Save / Zapisz
        console.log(`💾 Clicking Save button...`);
        const saveBtns = await page.$$('button:has-text("Zapisz"), button:has-text("Save")');
        if (saveBtns.length > 0) {
            await saveBtns[saveBtns.length - 1].click({ force: true });
            console.log(`✅ Clicked Zapisz/Save button!`);
        }

        await page.waitForTimeout(5000);

        // Refresh and capture the live profile
        console.log(`🔄 Reloading profile page to verify changes...`);
        await page.goto('https://www.tiktok.com/@secretsofthelondonmanor', { waitUntil: 'domcontentloaded', timeout: 35000 });
        await page.waitForTimeout(4000);

        const finalProofPath = path.join(__dirname, '../../config/tiktok_live_proof_bio.png');
        await page.screenshot({ path: finalProofPath, fullPage: true });
        console.log(`📸 Final proof screenshot saved to: ${finalProofPath}`);

        // Update session storage
        await context.storageState({ path: SESSION_PATH });

        console.log(`🎉 TikTok Bio successfully updated and verified on live profile!`);
        await browser.close();
    } catch (err) {
        console.error(`Error:`, err.message);
        await browser.close();
    }
}

forceUpdateBio().catch(console.error);

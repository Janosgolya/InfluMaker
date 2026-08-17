const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/tiktok_session.json');

async function updateBioViaNav() {
    console.log(`\n======================================================`);
    console.log(`🔄 TIKTOK BIO UPDATE (Internal Navigation Flow)`);
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
        console.log(`🌐 Navigating to TikTok Home...`);
        await page.goto('https://www.tiktok.com', { waitUntil: 'domcontentloaded', timeout: 35000 });
        await page.waitForTimeout(4000);

        // Click "Profil" in sidebar
        console.log(`🔍 Clicking 'Profil' in sidebar...`);
        const profileBtn = await page.$('a[href*="/@"], span:has-text("Profil"), a:has-text("Profil")');
        if (profileBtn) {
            await profileBtn.click();
            await page.waitForTimeout(4000);
        } else {
            console.log(`Navigating directly to profile URL...`);
            await page.goto('https://www.tiktok.com/@secretsofthelondonmanor', { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(4000);
        }

        const screen1 = path.join(__dirname, '../../config/tiktok_nav_step1.png');
        await page.screenshot({ path: screen1 });
        console.log(`📸 Screenshot saved: ${screen1}`);

        // Find Edit Profile button
        console.log(`🔍 Looking for edit button...`);
        const editBtn = await page.$('button:has-text("Edytuj profil"), button:has-text("Edit profile"), [data-e2e="edit-profile-entrance"]');
        if (!editBtn) {
            // Check if there is an edit icon or aria-label
            const allBtns = await page.$$('button');
            for (const b of allBtns) {
                const t = await b.innerText().catch(() => '');
                if (t.includes('Edytuj') || t.includes('Edit')) {
                    await b.click();
                    break;
                }
            }
        } else {
            await editBtn.click();
        }

        await page.waitForTimeout(3000);

        const newBio = "Maid in the manor 🕯️\nUncensored diary 👇\nfanvue.com/bettyryal";
        console.log(`✍️ Typing new bio (${newBio.length} chars):\n${newBio}`);

        const textarea = await page.waitForSelector('textarea', { timeout: 8000 });
        await textarea.click();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(300);
        await page.keyboard.type(newBio, { delay: 15 });
        await page.waitForTimeout(1000);

        // Click Save / Zapisz
        console.log(`💾 Clicking Save button...`);
        const saveBtns = await page.$$('button:has-text("Zapisz"), button:has-text("Save")');
        if (saveBtns.length > 0) {
            await saveBtns[saveBtns.length - 1].click({ force: true });
            console.log(`✅ Save button clicked!`);
        }

        await page.waitForTimeout(4000);

        // Take updated screenshot
        const finalScreen = path.join(__dirname, '../../config/tiktok_bio_updated_live.png');
        await page.screenshot({ path: finalScreen, fullPage: true });
        console.log(`📸 Updated profile screenshot saved: ${finalScreen}`);

        // Update session
        await context.storageState({ path: SESSION_PATH });

        console.log(`🎉 Bio successfully updated on TikTok!`);
        await browser.close();
    } catch (err) {
        console.error(`Error:`, err.message);
        const errScreen = path.join(__dirname, '../../config/tiktok_nav_err.png');
        await page.screenshot({ path: errScreen }).catch(() => {});
        await browser.close();
    }
}

updateBioViaNav().catch(console.error);

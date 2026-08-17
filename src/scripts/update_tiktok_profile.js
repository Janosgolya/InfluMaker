const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/tiktok_session.json');

async function updateProfile() {
    console.log(`\n⚙️ Updating TikTok Profile Configuration for Betty...`);

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
        console.log(`🌐 Navigating to TikTok profile...`);
        await page.goto('https://www.tiktok.com/@secretsofthelondonmanor', { waitUntil: 'domcontentloaded', timeout: 35000 });
        await page.waitForTimeout(4000);

        // Click "Edit profile" button
        console.log(`🔍 Looking for 'Edit profile' button...`);
        const editBtn = await page.$('button:has-text("Edit profile")');
        if (!editBtn) {
            throw new Error("Could not find 'Edit profile' button on profile page");
        }

        await editBtn.click();
        await page.waitForTimeout(3000);

        const modalScreenshot = path.join(__dirname, '../../config/tiktok_edit_profile_modal.png');
        await page.screenshot({ path: modalScreenshot });
        console.log(`📸 Edit Profile modal screenshot saved to: ${modalScreenshot}`);

        // Update Bio text
        const newBio = "A girl discovering the manor's secrets 🗝️\nSteam, linen & candlelight 🕯️\nStep into my secret attic room 👇\nfanvue.com/bettyryal";

        const bioTextarea = await page.$('textarea[placeholder*="Bio"], textarea');
        if (bioTextarea) {
            console.log(`✍️ Updating Bio text...`);
            await bioTextarea.click();
            await page.keyboard.press('Control+A');
            await page.keyboard.press('Backspace');
            await bioTextarea.fill(newBio);
            console.log(`Bio updated to:\n${newBio}`);
        }

        await page.waitForTimeout(2000);

        // Click Save button
        const saveBtn = await page.$('button:has-text("Save"), button:has-text("Zapisz")');
        if (saveBtn) {
            console.log(`💾 Clicking Save button...`);
            await saveBtn.click();
            await page.waitForTimeout(3000);
        }

        // Save updated session state
        await context.storageState({ path: SESSION_PATH });

        // Take final profile screenshot
        const updatedScreenshot = path.join(__dirname, '../../config/tiktok_profile_updated.png');
        await page.screenshot({ path: updatedScreenshot, fullPage: true });
        console.log(`📸 Updated Profile screenshot saved to: ${updatedScreenshot}`);

        console.log(`\n🎉 TikTok Profile successfully updated!`);
        await browser.close();
    } catch (err) {
        console.error(`Update profile error:`, err.message);
        await browser.close();
    }
}

updateProfile().catch(console.error);

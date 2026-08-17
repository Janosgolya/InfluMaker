const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/tiktok_session.json');

async function setBio() {
    console.log(`\n✍️ Setting TikTok Bio under 80-character limit...`);

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
        await page.goto('https://www.tiktok.com/@secretsofthelondonmanor', { waitUntil: 'domcontentloaded', timeout: 35000 });
        await page.waitForTimeout(4000);

        const editBtn = await page.$('button:has-text("Edit profile")');
        if (!editBtn) throw new Error("Edit profile button not found");

        await editBtn.click();
        await page.waitForTimeout(2000);

        const bioText = "Maid in the manor 🕯️\nUncensored diary 👇\nfanvue.com/bettyryal";
        console.log(`Setting bio (${bioText.length} chars):\n${bioText}`);

        const textarea = await page.$('textarea');
        if (textarea) {
            await textarea.click();
            await page.keyboard.press('Control+A');
            await page.keyboard.press('Backspace');
            await textarea.fill(bioText);
            await page.waitForTimeout(1000);

            const saveBtn = await page.$('button:has-text("Save"), button:has-text("Zapisz")');
            if (saveBtn) {
                await saveBtn.click();
                console.log(`💾 Clicked Save button!`);
                await page.waitForTimeout(4000);
            }
        }

        // Save session
        await context.storageState({ path: SESSION_PATH });

        // Final screenshot
        const screenshotPath = path.join(__dirname, '../../config/tiktok_profile_final.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`📸 Final screenshot saved to: ${screenshotPath}`);

        await browser.close();
        console.log(`✅ Bio updated successfully!`);
    } catch (e) {
        console.error(`Error:`, e.message);
        await browser.close();
    }
}

setBio().catch(console.error);

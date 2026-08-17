const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/tiktok_session.json');

async function cleanTikTokDuplicate() {
    console.log(`\n======================================================`);
    console.log(`🧹 TIKTOK: Deleting Duplicate Video in Studio`);
    console.log(`======================================================`);

    const browser = await chromium.launch({
        headless: false,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--start-maximized'
        ]
    });

    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    try {
        await page.goto('https://www.tiktok.com/tiktokstudio/content', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);

        // Find the date element for the second row
        const row2Date = page.locator('text=5:03').first();
        if (await row2Date.isVisible()) {
            const dateBox = await row2Date.boundingBox();
            console.log(`Row 2 location:`, dateBox);

            // In TikTok Studio, the 3-dots icon is on the right side at x around 932px
            console.log(`Clicking 3 dots at coordinates: x=932, y=${dateBox.y + 10}...`);
            await page.mouse.click(932, dateBox.y + 10);
            await page.waitForTimeout(2000);

            await page.screenshot({ path: path.join(__dirname, '../../config/tiktok_dots_clicked.png') });

            // Click "Usuń" / "Delete"
            const deleteOption = page.locator('text=Usuń, text=Delete').first();
            if (await deleteOption.isVisible()) {
                console.log(`Clicking Delete option...`);
                await deleteOption.click();
                await page.waitForTimeout(2000);

                await page.screenshot({ path: path.join(__dirname, '../../config/tiktok_confirm_modal.png') });

                // Click confirm button
                const confirmDelete = page.locator('div[role="dialog"] button, .TUXModal button, button').filter({ hasText: /^Usuń$|^Delete$/i }).last();
                await confirmDelete.click();
                console.log(`✅ Duplicate TikTok video deleted!`);
                await page.waitForTimeout(4000);
            }
        }

        await page.screenshot({ path: path.join(__dirname, '../../config/tiktok_studio_perfect.png') });
        await context.storageState({ path: SESSION_PATH });

    } catch (e) {
        console.error(`Error:`, e.message);
    } finally {
        await browser.close();
    }
}

cleanTikTokDuplicate();

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/tiktok_session.json');

async function cleanTikTokDuplicateRow() {
    console.log(`\n======================================================`);
    console.log(`🧹 TIKTOK: Deleting duplicate row (Row 2) in TikTok Studio`);
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

        // Find all 3-dots buttons in the action column
        // In TikTok Studio, the 3-dots icon is inside an SVG or button
        console.log(`Finding 3-dots button on Row 2...`);
        const rows = await page.$$('tr, div[class*="table-row"], div[class*="content-item"]');
        console.log(`Found rows on page.`);

        // Click the second 3-dots button on the page
        const threeDotsButtons = page.locator('button, div[role="button"]').filter({ has: page.locator('svg') });
        const count = await threeDotsButtons.count();
        console.log(`Found ${count} icon buttons.`);

        // Use evaluate to find the 3 dots on the second row with text '5:03' or second instance
        const clicked = await page.evaluate(() => {
            const allElements = Array.from(document.querySelectorAll('div, button, span'));
            // Find 3-dots SVGs or action elements
            const actionDots = allElements.filter(el => {
                const isDots = el.tagName === 'BUTTON' || el.getAttribute('role') === 'button' || el.tagName === 'DIV';
                return isDots && el.querySelector('svg') && el.getBoundingClientRect().left > 1200;
            });
            console.log('Action dots found:', actionDots.length);
            // Click the second one (Row 2)
            if (actionDots.length >= 2) {
                actionDots[1].click();
                return true;
            } else if (actionDots.length > 0) {
                actionDots[0].click();
                return true;
            }
            return false;
        });

        console.log(`Clicked 3 dots menu on row:`, clicked);
        await page.waitForTimeout(2000);

        await page.screenshot({ path: path.join(__dirname, '../../config/tiktok_menu_open.png') });

        // Click "Usuń" / "Delete" from dropdown
        console.log(`Clicking Delete option...`);
        const deleteOption = page.locator('div, button, span, li').filter({ hasText: /^Usuń$|^Delete$/i }).first();
        if (await deleteOption.isVisible()) {
            await deleteOption.click({ force: true });
            await page.waitForTimeout(2000);

            await page.screenshot({ path: path.join(__dirname, '../../config/tiktok_confirm_delete_modal.png') });

            // Confirm Delete
            console.log(`Confirming delete...`);
            const confirmBtn = page.locator('button, div[role="button"]').filter({ hasText: /^Usuń$|^Delete$/i }).last();
            await confirmBtn.click({ force: true });
            console.log(`✅ Duplicate TikTok video deleted successfully!`);
            await page.waitForTimeout(4000);
        }

        await page.screenshot({ path: path.join(__dirname, '../../config/tiktok_studio_final_cleaned.png') });
        await context.storageState({ path: SESSION_PATH });

    } catch (e) {
        console.error(`Error:`, e.message);
    } finally {
        await browser.close();
    }
}

cleanTikTokDuplicateRow();

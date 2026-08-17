const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/tiktok_session.json');

async function confirmDeleteTikTok() {
    const browser = await chromium.launch({
        headless: false,
        args: ['--disable-blink-features=AutomationControlled', '--start-maximized']
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

        // Open 3 dots menu on row 2
        await page.evaluate(() => {
            const allElements = Array.from(document.querySelectorAll('*'));
            const dateEl = allElements.find(el => el.children.length === 0 && el.textContent.includes('5:03'));
            if (!dateEl) return;
            let row = dateEl;
            while (row && row.parentElement) {
                row = row.parentElement;
                if (row.querySelectorAll && row.querySelectorAll('svg').length >= 4) break;
            }
            const svgs = Array.from(row.querySelectorAll('svg, button, div[role="button"]'));
            if (svgs.length > 0) {
                const target = svgs[svgs.length - 1];
                target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                if (typeof target.click === 'function') target.click();
            }
        });

        await page.waitForTimeout(1500);

        // Click "Usuń" from menu
        console.log(`Clicking 'Usuń' in dropdown...`);
        const deleteItem = page.locator('span, div, p').filter({ hasText: /^Usuń$/ }).first();
        await deleteItem.click({ force: true });
        await page.waitForTimeout(2000);

        await page.screenshot({ path: path.join(__dirname, '../../config/tiktok_confirm_popup.png') });

        // Click confirm Delete in the modal dialog
        console.log(`Confirming delete in modal...`);
        const confirmBtn = page.locator('div[role="dialog"] button, .TUXModal button, button').filter({ hasText: /^Usuń$/ }).last();
        await confirmBtn.click({ force: true });
        console.log(`✅ Duplicate TikTok post deleted!`);
        await page.waitForTimeout(4000);

        await page.screenshot({ path: path.join(__dirname, '../../config/tiktok_studio_perfect_clean.png') });
        await context.storageState({ path: SESSION_PATH });

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await browser.close();
    }
}

confirmDeleteTikTok();

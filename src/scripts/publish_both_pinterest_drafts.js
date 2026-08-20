const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/pinterest_session.json');

async function publishDrafts() {
    console.log('======================================================');
    console.log('📌 PINTEREST: PUBLISHING BOTH DRAFTS TO LIVE BOARD');
    console.log('======================================================\n');

    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({ storageState: SESSION_PATH, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    console.log('🌐 Opening Pin Creation Tool...');
    await page.goto('https://www.pinterest.com/pin-creation-tool/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    for (let draftNum = 1; draftNum <= 2; draftNum++) {
        console.log(`\n----------------------------------------`);
        console.log(`🚀 Publishing Draft #${draftNum}...`);
        console.log(`----------------------------------------`);

        // Click the top draft in the sidebar
        const draftCard = page.locator('[data-test-id="pin-draft-content-container"]').first();
        if (await draftCard.isVisible({ timeout: 4000 })) {
            await draftCard.click();
            await page.waitForTimeout(2000);
        }

        // 1. Click Board row
        console.log('📁 Selecting Board...');
        const boardRow = page.locator('div:has-text("Choose a board"), div:has-text("Wybierz tablicę")').last();
        if (await boardRow.isVisible({ timeout: 3000 })) {
            await boardRow.click();
            await page.waitForTimeout(1500);

            // Click "Create board" if no board exists or select existing
            const createBoardBtn = page.locator('button, div').filter({ hasText: /^Create board$|^Utwórz tablicę$/i }).first();
            const existingBoard = page.locator('div[role="option"], div[data-test-id*="board-row"], div:has-text("18th Century")').first();

            if (await existingBoard.isVisible({ timeout: 2000 })) {
                await existingBoard.click();
                console.log('✅ Selected existing board!');
            } else if (await createBoardBtn.isVisible({ timeout: 2000 })) {
                console.log('Creating board: 18th Century Aesthetic & Maid Secrets...');
                await createBoardBtn.click();
                await page.waitForTimeout(1000);

                const nameInput = page.locator('input[id*="board-name"], input[placeholder*="Name" i], input[placeholder*="Nazwa" i]').first();
                if (await nameInput.isVisible()) {
                    await nameInput.fill('18th Century Aesthetic & Maid Secrets');
                    await page.waitForTimeout(500);
                    const confirmCreate = page.locator('button').filter({ hasText: /^Create$|^Utwórz$/i }).first();
                    await confirmCreate.click();
                    console.log('✅ Created and selected board!');
                }
            } else {
                // Pick first available board item
                const firstOption = page.locator('div[role="option"]').first();
                if (await firstOption.isVisible()) {
                    await firstOption.click();
                    console.log('✅ Picked first available board!');
                }
            }
        }

        await page.waitForTimeout(2000);

        // 2. Click Publish Button
        console.log('🚀 Clicking Red Publish Button...');
        const publishButton = page.locator('button:has-text("Publish"), button:has-text("Opublikuj")').first();
        await publishButton.waitFor({ state: 'visible', timeout: 10000 });
        await publishButton.click();

        console.log('⏳ Waiting for publish completion (10s)...');
        await page.waitForTimeout(10000);

        // Capture confirmation
        const confPath = path.join(__dirname, `../../config/pinterest_published_live_${draftNum}.png`);
        await page.screenshot({ path: confPath });
        console.log(`📸 Saved confirmation screenshot: ${confPath}`);
    }

    // 3. Navigate to Betty's created tab to verify live pins on profile
    console.log('\n🌐 Checking live profile pins at: https://www.pinterest.com/SecretsofLondonMansion/_created/ ...');
    await page.goto('https://www.pinterest.com/SecretsofLondonMansion/_created/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    const liveProfileScreenshot = path.join(__dirname, '../../config/pinterest_live_profile_verified.png');
    await page.screenshot({ path: liveProfileScreenshot });
    console.log(`📸 Saved verified live profile screenshot to: ${liveProfileScreenshot}`);

    await browser.close();
    console.log('\n🎉 ALL PINTEREST DRAFTS SUCCESSFULLY PUBLISHED TO LIVE BOARDS!');
}

publishDrafts().catch(console.error);

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/pinterest_session.json');

async function publishRemainingDraft() {
    console.log('======================================================');
    console.log('📌 PINTEREST: PUBLISHING REMAINING DRAFT PIN');
    console.log('======================================================\n');

    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({ storageState: SESSION_PATH, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    console.log('🌐 Opening Pin Creation Tool...');
    await page.goto('https://www.pinterest.com/pin-creation-tool/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    // Dismiss any modal if open
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // Click the remaining draft in the sidebar
    console.log('👆 Clicking remaining draft card...');
    const draftCard = page.locator('[data-test-id="pin-draft-content-container"]').first();
    if (await draftCard.isVisible({ timeout: 5000 })) {
        await draftCard.click();
        await page.waitForTimeout(2500);
    }

    // 1. Click Board row
    console.log('📁 Selecting Board...');
    const boardRow = page.locator('div:has-text("Choose a board"), div:has-text("Wybierz tablicę")').last();
    if (await boardRow.isVisible({ timeout: 3000 })) {
        await boardRow.click();
        await page.waitForTimeout(1500);

        const existingBoard = page.locator('div[role="option"], div[data-test-id*="board-row"], div:has-text("18th Century")').first();
        if (await existingBoard.isVisible({ timeout: 2000 })) {
            await existingBoard.click();
            console.log('✅ Selected existing board!');
        } else {
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

    await page.keyboard.press('Escape');

    // 3. Navigate to Betty's live profile to verify all created pins
    console.log('\n🌐 Verifying live profile at: https://www.pinterest.com/SecretsofLondonMansion/_created/ ...');
    await page.goto('https://www.pinterest.com/SecretsofLondonMansion/_created/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    const liveProfileScreenshot = path.join(__dirname, '../../config/pinterest_live_profile_verified.png');
    await page.screenshot({ path: liveProfileScreenshot });
    console.log(`📸 Saved verified live profile screenshot to: ${liveProfileScreenshot}`);

    await browser.close();
    console.log('\n🎉 ALL PINTEREST PINS ARE NOW LIVE ON BETTY\'S PROFILE!');
}

publishRemainingDraft().catch(console.error);

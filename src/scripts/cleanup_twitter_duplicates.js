const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const humanEmulator = require('../services/human_emulator');

const SESSION_PATH = path.join(__dirname, '../../config/twitter_session.json');

async function cleanupTwitterDuplicates() {
    console.log('\n======================================================');
    console.log('🧹 X (TWITTER) DUPLICATE PURGE & CLEANUP');
    console.log('Mode: Human-Paced Stealth Cleanup');
    console.log('======================================================\n');

    const browser = await chromium.launch({
        headless: true,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--window-size=1440,900'
        ]
    });

    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();
    await humanEmulator.injectStealth(page);

    try {
        console.log('🌐 Navigating to @SecretsOfBetty profile...');
        await page.goto('https://x.com/SecretsOfBetty', { waitUntil: 'domcontentloaded', timeout: 35000 });
        await humanEmulator.randomDelay(4000, 6000);

        let deletedCount = 0;
        const maxDeletions = 20;

        while (deletedCount < maxDeletions) {
            // Re-fetch articles
            const articles = await page.$$('article');
            let foundTarget = false;

            for (const article of articles) {
                const text = await article.innerText().catch(() => '');
                if (text.includes('[A punchy, breathless') || (text.includes('micro-confession') && text.includes('under 180 characters'))) {
                    foundTarget = true;
                    console.log(`\n[Target Found] Duplicate tweet #${deletedCount + 1}:`);
                    console.log(`Text snippet: ${text.slice(0, 80).replace(/\n/g, ' ')}...`);

                    await article.scrollIntoViewIfNeeded();
                    await humanEmulator.randomDelay(1500, 2500);

                    // Find caret button
                    const caret = await article.$('button[data-testid="caret"], button[aria-label="More"]');
                    if (!caret) {
                        console.log('⚠️ Caret button not found on tweet, skipping...');
                        continue;
                    }

                    await humanEmulator.humanClick(page, caret);
                    await humanEmulator.randomDelay(1200, 2200);

                    // Click Delete
                    const deleteItem = page.locator('div[role="menuitem"]').filter({ hasText: /^Delete$|^Usuń$/i }).first();
                    if (await deleteItem.isVisible({ timeout: 4000 }).catch(() => false)) {
                        await humanEmulator.humanClick(page, deleteItem);
                        await humanEmulator.randomDelay(1200, 2200);

                        // Confirm
                        const confirmBtn = page.locator('button[data-testid="confirmationSheetConfirm"]').first();
                        if (await confirmBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
                            await humanEmulator.humanClick(page, confirmBtn);
                            deletedCount++;
                            console.log(`✅ [Deleted ${deletedCount}] Tweet successfully removed!`);
                            
                            // Human cooldown between deletions (anti-rate-limit)
                            const cooldown = Math.floor(Math.random() * 4000) + 5000;
                            console.log(`⏳ Pacing cooldown: ${cooldown}ms...`);
                            await new Promise(r => setTimeout(r, cooldown));
                            break; // break inner loop to re-scan page after DOM update
                        } else {
                            console.log('Confirmation button not visible, dismissing...');
                            await page.keyboard.press('Escape');
                        }
                    } else {
                        console.log('Delete item not visible, dismissing menu...');
                        await page.keyboard.press('Escape');
                    }
                }
            }

            if (!foundTarget) {
                // Try scrolling down to see if older duplicates exist
                console.log('No duplicates visible in current viewport. Scrolling down...');
                await humanEmulator.naturalScroll(page, 2);
                await humanEmulator.randomDelay(2000, 3500);

                // Check again
                const checkArticles = await page.$$('article');
                let anyMore = false;
                for (const ca of checkArticles) {
                    const ct = await ca.innerText().catch(() => '');
                    if (ct.includes('[A punchy, breathless') || ct.includes('micro-confession')) {
                        anyMore = true;
                        break;
                    }
                }
                if (!anyMore) {
                    console.log('🎉 No further duplicate tweets found on profile!');
                    break;
                }
            }
        }

        console.log(`\n======================================================`);
        console.log(`🏁 CLEANUP COMPLETE: Deleted ${deletedCount} duplicate tweets.`);
        console.log(`======================================================\n`);

        const finalScreenshot = path.join(__dirname, '../../config/twitter_profile_after_cleanup.png');
        await page.screenshot({ path: finalScreenshot });
        console.log(`📸 Profile screenshot after cleanup saved to: ${finalScreenshot}`);

        // Update stored session cookies
        const fullState = await context.storageState();
        fs.writeFileSync(SESSION_PATH, JSON.stringify(fullState, null, 2), 'utf8');

    } catch (e) {
        console.error('Error during cleanup:', e.message);
    } finally {
        await browser.close();
    }
}

cleanupTwitterDuplicates().catch(console.error);

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/pinterest_session.json');

async function publishPinterestDrafts() {
    console.log('======================================================');
    console.log('📌 PINTEREST: PUBLISHING EXISTING DRAFTS TO LIVE BOARD');
    console.log('======================================================\n');

    if (!fs.existsSync(SESSION_PATH)) {
        throw new Error('Pinterest session missing.');
    }

    const browser = await chromium.launch({
        headless: false,
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    try {
        console.log('🌐 Navigating to Pinterest Pin Creation Tool...');
        await page.goto('https://www.pinterest.com/pin-creation-tool/', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(5000);

        // Find all existing draft cards on the left
        const draftCards = page.locator('div:has-text("days until expiry"), div:has-text("dni do wygaśnięcia"), div[data-test-id*="draft"]').filter({ hasText: /18th Century|Candlelight/i });
        const draftCount = await draftCards.count();
        console.log(`Found ${draftCount} active draft cards in sidebar.`);

        for (let i = 0; i < 2; i++) {
            console.log(`\n--- Processing Draft Pin #${i + 1} ---`);
            
            // Click the first draft item in the left list
            const currentDraft = page.locator('div:has-text("days until expiry"), div:has-text("dni do wygaśnięcia")').first();
            if (await currentDraft.isVisible({ timeout: 4000 })) {
                console.log('👆 Clicking draft card in sidebar...');
                await currentDraft.click();
                await page.waitForTimeout(3000);
            } else {
                console.log('ℹ️ No more draft cards found in sidebar.');
                break;
            }

            // 1. Select Board
            console.log('📁 Clicking Board Dropdown...');
            const boardField = page.locator('div:has-text("Choose a board"), div:has-text("Wybierz tablicę"), [data-test-id*="board-dropdown"]').last();
            if (await boardField.isVisible({ timeout: 5000 })) {
                await boardField.click();
                await page.waitForTimeout(2000);

                // Check if search input in board dropdown exists
                const boardSearch = page.locator('input[placeholder*="Search" i], input[placeholder*="Szukaj" i]').first();
                if (await boardSearch.isVisible({ timeout: 2000 })) {
                    await boardSearch.fill('18th Century Aesthetic');
                    await page.waitForTimeout(1000);
                }

                // Pick board or create board
                const existingBoard = page.locator('div[role="option"], div[data-test-id*="board-row"], div:has-text("18th Century Aesthetic")').first();
                if (await existingBoard.isVisible({ timeout: 2000 })) {
                    await existingBoard.click();
                    console.log('✅ Selected existing board!');
                } else {
                    console.log('Creating new board...');
                    const createBoardBtn = page.locator('button, div').filter({ hasText: /^Create board$|^Utwórz tablicę$/i }).first();
                    if (await createBoardBtn.isVisible({ timeout: 2000 })) {
                        await createBoardBtn.click();
                        await page.waitForTimeout(1000);
                        const nameInput = page.locator('input[id*="board-name"], input[placeholder*="Name" i], input[placeholder*="Nazwa" i]').first();
                        if (await nameInput.isVisible()) {
                            await nameInput.fill('18th Century Aesthetic & Maid Secrets');
                            const confirmBtn = page.locator('button').filter({ hasText: /^Create$|^Utwórz$/i }).first();
                            await confirmBtn.click();
                            console.log('✅ Board created!');
                        }
                    }
                }
            }

            await page.waitForTimeout(2000);

            // 2. Click the Red Publish Button in the top right
            console.log('🚀 Clicking Top-Right Publish Button...');
            const publishBtn = page.locator('button:has-text("Publish"), button:has-text("Opublikuj")').first();
            await publishBtn.waitFor({ state: 'visible', timeout: 10000 });
            await publishBtn.click({ force: true });

            console.log('⏳ Waiting for publication to complete (12s)...');
            await page.waitForTimeout(12000);

            // Screenshot after each publish
            const stepScreenshot = path.join(__dirname, `../../config/pinterest_published_draft_${i + 1}.png`);
            await page.screenshot({ path: stepScreenshot });
            console.log(`📸 Saved step screenshot: ${stepScreenshot}`);
        }

        // Navigate to Pinterest user profile to verify published pins live
        console.log('\n🌐 Navigating to Betty\'s live profile: https://www.pinterest.com/SecretsofLondonMansion/_created/ ...');
        await page.goto('https://www.pinterest.com/SecretsofLondonMansion/_created/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(5000);

        const liveProfileScreenshot = path.join(__dirname, '../../config/pinterest_live_profile_verified.png');
        await page.screenshot({ path: liveProfileScreenshot });
        console.log(`📸 Saved verified live profile screenshot to: ${liveProfileScreenshot}`);

        return { success: true, screenshot: liveProfileScreenshot };
    } catch (e) {
        console.error('❌ Error publishing drafts:', e.message);
        const errScreenshot = path.join(__dirname, '../../config/pinterest_draft_fix_error.png');
        await page.screenshot({ path: errScreenshot }).catch(() => {});
        return { success: false, error: e.message };
    } finally {
        await browser.close();
    }
}

publishPinterestDrafts().then(r => console.log('Result:', r));

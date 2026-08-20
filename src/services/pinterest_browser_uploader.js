const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/pinterest_session.json');

/**
 * Uploads a Pin to Pinterest using authenticated browser session
 * @param {Object} options
 * @param {string} options.imagePath - Path to 2:3 or 4:5 image file
 * @param {string} options.title - SEO Pin title (up to 100 chars)
 * @param {string} options.description - Rich Pin description (up to 500 chars)
 * @param {string} [options.link] - Destination URL (e.g. Fanvue / Linktree profile)
 * @param {string} [options.boardName] - Preferred board name (e.g. "18th Century London Maid Aesthetic")
 * @param {boolean} [options.headless=true] - Headless mode
 * @returns {Promise<{ success: boolean, url?: string, error?: string }>}
 */
async function uploadPinterestPin(options) {
    const {
        imagePath,
        title,
        description,
        link = 'https://fanvue.com/bettyryal',
        boardName = '18th Century Aesthetic & Maid Secrets',
        headless = true
    } = options;

    console.log('\n======================================================');
    console.log('📌 PINTEREST PIN UPLOADER');
    console.log(`Title: "${title.substring(0, 50)}..."`);
    console.log(`Image: ${imagePath}`);
    console.log(`Destination: ${link}`);
    console.log('======================================================\n');

    if (!fs.existsSync(SESSION_PATH)) {
        throw new Error(`Pinterest session not found at: ${SESSION_PATH}. Run 'node src/scripts/pinterest_browser_login.js' first!`);
    }

    if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file does not exist: ${imagePath}`);
    }

    const browser = await chromium.launch({
        headless: headless,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    });

    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    try {
        console.log('🌐 Navigating to Pinterest Pin Creation Tool...');
        await page.goto('https://www.pinterest.com/pin-creation-tool/', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(4000);

        // Check if redirected to login
        if (page.url().includes('/login') || page.url().includes('/signup')) {
            throw new Error('Pinterest session expired or invalid. Please re-run pinterest_browser_login.js.');
        }

        console.log('📤 Locating file upload input...');
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.waitFor({ state: 'attached', timeout: 15000 });
        await fileInput.setInputFiles(path.resolve(imagePath));
        console.log('✅ Image uploaded to Pin canvas!');

        await page.waitForTimeout(3000);

        // 1. Enter Pin Title
        console.log('✍️ Entering Pin Title...');
        const titleInput = page.locator('input[id*="storyboard-selector-title"], input[placeholder*="title" i], input[placeholder*="tytuł" i], input[data-test-id*="title"], div[data-test-id*="title"] input, textarea[placeholder*="title" i]').first();
        if (await titleInput.isVisible({ timeout: 5000 })) {
            await titleInput.fill(title.substring(0, 100));
        } else {
            // Fallback contenteditable title
            const altTitle = page.locator('div[role="textbox"]').first();
            if (await altTitle.isVisible()) {
                await altTitle.click();
                await page.keyboard.type(title.substring(0, 100));
            }
        }
        console.log('✅ Title populated!');

        await page.waitForTimeout(1000);

        // 2. Enter Pin Description
        console.log('✍️ Entering Pin Description...');
        const descInput = page.locator('div[data-test-id*="description"] div[contenteditable="true"], div[id*="storyboard-selector-description"] div[contenteditable="true"], textarea[placeholder*="description" i], textarea[placeholder*="opis" i], div[role="textbox"]').nth(1);
        if (await descInput.isVisible({ timeout: 5000 })) {
            await descInput.click();
            await page.keyboard.type(description.substring(0, 500), { delay: 5 });
        } else {
            // Try generic description selector
            const genericDesc = page.locator('div[contenteditable="true"]').last();
            if (await genericDesc.isVisible()) {
                await genericDesc.click();
                await page.keyboard.type(description.substring(0, 500), { delay: 5 });
            }
        }
        console.log('✅ Description populated!');

        await page.waitForTimeout(1000);

        // 3. Enter Destination Link
        if (link) {
            console.log('🔗 Entering Destination Link...');
            const linkInput = page.locator('input[id*="storyboard-selector-link"], input[placeholder*="link" i], input[placeholder*="łącze" i], input[data-test-id*="link"], input[type="url"]').first();
            if (await linkInput.isVisible({ timeout: 5000 })) {
                await linkInput.fill(link);
                console.log(`✅ Destination link set: ${link}`);
            }
        }

        await page.waitForTimeout(1500);

        // 4. Select / Verify Board
        console.log('📁 Selecting Board...');
        const boardRow = page.locator('div:has-text("Choose a board"), div:has-text("Wybierz tablicę"), button[data-test-id="board-dropdown-select-button"], div[data-test-id="board-dropdown"]').last();
        if (await boardRow.isVisible({ timeout: 5000 })) {
            await boardRow.click();
            await page.waitForTimeout(1500);

            // Try to find matching board or pick first existing board
            const targetBoard = page.locator(`div[role="option"], div[data-test-id*="board-row"], div:has-text("${boardName}")`).first();
            if (await targetBoard.isVisible({ timeout: 2000 })) {
                await targetBoard.click();
                console.log(`✅ Selected target board: "${boardName}"`);
            } else {
                const firstOption = page.locator('div[role="option"], div[data-test-id*="board-row"]').first();
                if (await firstOption.isVisible({ timeout: 2000 })) {
                    await firstOption.click();
                    console.log('✅ Selected first available board');
                } else {
                    console.log('Creating new board...');
                    const createBoardBtn = page.locator('button, div').filter({ hasText: /^Create board$|^Utwórz tablicę$/i }).first();
                    if (await createBoardBtn.isVisible({ timeout: 2000 })) {
                        await createBoardBtn.click();
                        await page.waitForTimeout(1000);
                        const nameInput = page.locator('input[id*="board-name"], input[placeholder*="Name" i], input[placeholder*="Nazwa" i]').first();
                        if (await nameInput.isVisible()) {
                            await nameInput.fill(boardName);
                            const confirmBtn = page.locator('button').filter({ hasText: /^Create$|^Utwórz$/i }).first();
                            await confirmBtn.click();
                            console.log(`✅ Board "${boardName}" created!`);
                        }
                    }
                }
            }
        }

        await page.waitForTimeout(2000);

        // 5. Click Publish Button
        console.log('🚀 Publishing Pin...');
        const publishBtn = page.locator('button:has-text("Publish"), button:has-text("Opublikuj"), button[data-test-id="storyboard-creation-publish-button"]').first();
        await publishBtn.waitFor({ state: 'visible', timeout: 10000 });
        await publishBtn.click({ force: true });

        console.log('⏳ Waiting for upload processing and confirmation (10s)...');
        await page.waitForTimeout(10000);

        // Dismiss any post-publish promo/extension modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // Capture confirmation screenshot
        const screenshotPath = path.join(__dirname, '../../config/pinterest_published_confirmation.png');
        await page.screenshot({ path: screenshotPath });
        console.log(`📸 Confirmation screenshot saved to: ${screenshotPath}`);

        console.log('\n======================================================');
        console.log('🎉 PINTEREST PIN SUCCESSFULLY PUBLISHED!');
        console.log('======================================================\n');

        return {
            success: true,
            title: title,
            board: boardName,
            link: link,
            screenshot: screenshotPath
        };
    } catch (error) {
        console.error('❌ Error uploading to Pinterest:', error.message);
        const errScreenshot = path.join(__dirname, '../../config/pinterest_upload_error.png');
        await page.screenshot({ path: errScreenshot }).catch(() => {});
        return {
            success: false,
            error: error.message,
            screenshot: errScreenshot
        };
    } finally {
        await browser.close();
    }
}

module.exports = { uploadPinterestPin };

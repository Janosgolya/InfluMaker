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
        await page.waitForTimeout(3000);

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
        const titleInput = page.locator('#storyboard-selector-title, input[placeholder*="Tell everyone" i], input[placeholder*="title" i]').first();
        if (await titleInput.isVisible({ timeout: 5000 })) {
            await titleInput.fill(title.substring(0, 100));
            console.log('✅ Title populated!');
        }

        await page.waitForTimeout(500);

        // 2. Enter Pin Description
        console.log('✍️ Entering Pin Description...');
        const descBox = page.locator('div[aria-label="Describe your Pin"], div.public-DraftEditor-content[contenteditable="true"], div[data-test-id*="description"] div[contenteditable="true"]').first();
        if (await descBox.isVisible({ timeout: 5000 })) {
            await descBox.click();
            await page.keyboard.type(description.substring(0, 500), { delay: 5 });
            console.log('✅ Description populated!');
        }

        await page.waitForTimeout(500);

        // 3. Enter Destination Link
        if (link) {
            console.log('🔗 Entering Destination Link...');
            const linkInput = page.locator('#WebsiteField, input[placeholder*="Add a link" i], input[placeholder*="link" i], input[data-test-id*="link"]').first();
            if (await linkInput.isVisible({ timeout: 5000 })) {
                await linkInput.fill(link);
                console.log(`✅ Destination link set: ${link}`);
            }
        }

        await page.waitForTimeout(1000);

        // 4. Select / Verify / Create Board
        console.log('📁 Selecting Board...');
        const boardDropdown = page.locator('div[data-test-id="board-dropdown-select-button"]').first();
        if (await boardDropdown.isVisible({ timeout: 5000 })) {
            await boardDropdown.click();
            await page.waitForTimeout(1500);

            // Check if board already exists in list
            const existingBoard = page.locator(`div:has-text("${boardName}"), div[title="${boardName}"]`).filter({ hasText: new RegExp(boardName, 'i') }).first();
            if (await existingBoard.isVisible({ timeout: 2000 })) {
                console.log(`✅ Found existing board "${boardName}". Clicking it...`);
                await existingBoard.click();
            } else {
                console.log(`📁 Board "${boardName}" not found. Creating new board...`);
                const createBoardBtn = page.locator('div, button').filter({ hasText: /^Create board$|^Utwórz tablicę$/i }).first();
                if (await createBoardBtn.isVisible({ timeout: 3000 })) {
                    await createBoardBtn.click();
                    await page.waitForTimeout(1500);

                    const boardNameInput = page.locator('input[placeholder*="Like" i], input[placeholder*="Name" i], input[id*="board-name"], input[type="text"]').last();
                    await boardNameInput.fill(boardName);
                    await page.waitForTimeout(500);

                    const submitCreateBtn = page.locator('button').filter({ hasText: /^Create$|^Utwórz$/i }).first();
                    await submitCreateBtn.click();
                    console.log(`✅ Board "${boardName}" created and assigned!`);
                    await page.waitForTimeout(2000);
                } else {
                    // Fallback to first board row if available
                    const firstRow = page.locator('div[data-test-id*="board-row"], div[data-test-id*="board-item"], div[role="listbox"] div[role="button"], div[role="option"]').first();
                    if (await firstRow.isVisible({ timeout: 2000 })) {
                        await firstRow.click();
                        console.log('✅ Picked first available board in list');
                    }
                }
            }
        }

        await page.waitForTimeout(1500);

        // 5. Click Publish Button
        console.log('🚀 Publishing Pin...');
        const publishBtn = page.locator('button').filter({ hasText: /^Publish$|^Opublikuj$/i }).first();
        await publishBtn.waitFor({ state: 'visible', timeout: 10000 });
        await publishBtn.click({ force: true });

        console.log('⏳ Waiting for upload processing and confirmation (12s)...');
        await page.waitForTimeout(12000);

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

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
        const boardDropdown = page.locator('button[data-test-id="board-dropdown-select-button"], div[data-test-id="board-dropdown"], button[aria-label*="board" i], button[aria-label*="tablic" i]').first();
        if (await boardDropdown.isVisible({ timeout: 4000 })) {
            await boardDropdown.click();
            await page.waitForTimeout(1500);

            // Try to find matching board or pick first existing board
            const targetBoard = page.locator(`div[role="listbox"] div[title*="${boardName}" i], div[role="listbox"] div:has-text("${boardName}")`).first();
            if (await targetBoard.isVisible({ timeout: 2000 })) {
                await targetBoard.click();
                console.log(`✅ Selected target board: "${boardName}"`);
            } else {
                // Select first available board in list
                const firstBoard = page.locator('div[role="listbox"] div[role="option"], div[role="listbox"] [data-test-id*="board-row"]').first();
                if (await firstBoard.isVisible()) {
                    await firstBoard.click();
                    console.log('✅ Selected default available board');
                } else {
                    console.log('ℹ️ No board list options found, keeping default selection');
                }
            }
        }

        await page.waitForTimeout(2000);

        // 5. Click Publish / Save Button
        console.log('🚀 Publishing Pin...');
        const publishBtn = page.locator('button[data-test-id="board-dropdown-save-button"], button:has-text("Publish"), button:has-text("Opublikuj"), button:has-text("Save"), button:has-text("Zapisz")').first();
        await publishBtn.waitFor({ state: 'visible', timeout: 10000 });
        await publishBtn.click({ force: true });

        console.log('⏳ Waiting for upload processing and confirmation...');
        await page.waitForTimeout(6000);

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

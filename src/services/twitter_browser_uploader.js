const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/twitter_session.json');

/**
 * Uploads an image post with copy to X (Twitter)
 * @param {Object} options
 * @param {string} options.imagePath - Path to image file
 * @param {string} options.tweetText - Text content for the tweet
 * @param {boolean} [options.headless=true] - Headless mode
 * @returns {Promise<{ success: boolean, tweetUrl?: string, error?: string }>}
 */
async function uploadTwitterPost(options) {
    const {
        imagePath,
        tweetText,
        headless = true
    } = options;

    console.log('\n======================================================');
    console.log('🐦 X (TWITTER) POST UPLOADER');
    console.log(`Tweet: "${tweetText.substring(0, 100)}..."`);
    console.log(`Image: ${imagePath}`);
    console.log('======================================================\n');

    if (!fs.existsSync(SESSION_PATH)) {
        throw new Error(`Twitter session not found at: ${SESSION_PATH}. Run 'login_twitter.bat' first!`);
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
        console.log('🌐 Navigating to X / Twitter Compose...');
        await page.goto('https://x.com/compose/post', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(4000);

        // Check if redirected to login
        if (page.url().includes('/login') || page.url().includes('/i/flow/login')) {
            throw new Error('X/Twitter session expired or invalid. Please re-run login_twitter.bat.');
        }

        // 1. Enter Tweet Text
        console.log('✍️ Populating Tweet Text...');
        const textBox = page.locator('div[data-testid="tweetTextarea_0"], div[role="textbox"][contenteditable="true"]').first();
        await textBox.waitFor({ state: 'visible', timeout: 15000 });
        await textBox.click();
        await page.keyboard.type(tweetText, { delay: 5 });
        console.log('✅ Tweet text entered!');

        await page.waitForTimeout(1500);

        // 2. Upload Image File
        console.log('📤 Locating media upload input...');
        const fileInput = page.locator('input[data-testid="fileInput"], input[type="file"]').first();
        await fileInput.waitFor({ state: 'attached', timeout: 15000 });
        await fileInput.setInputFiles(path.resolve(imagePath));
        console.log('✅ Image uploaded to X canvas!');

        // Wait for media thumbnail upload confirmation
        console.log('⏳ Waiting for media thumbnail processing...');
        await page.waitForTimeout(4000);

        // 3. Click Post Button
        console.log('🚀 Clicking Tweet / Post Button...');
        const postBtn = page.locator('button[data-testid="tweetButton"], button[data-testid="tweetButtonInline"], button').filter({ hasText: /^Post$|^Opublikuj$|^Tweet$/i }).first();
        await postBtn.waitFor({ state: 'visible', timeout: 10000 });
        await postBtn.click({ force: true });

        console.log('⏳ Waiting for tweet submission confirmation...');
        await page.waitForTimeout(6000);

        const confirmationScreenshot = path.join(__dirname, '../../config/twitter_published_confirmation.png');
        await page.screenshot({ path: confirmationScreenshot });
        console.log(`📸 Confirmation screenshot saved to: ${confirmationScreenshot}`);

        console.log('\n======================================================');
        console.log('🎉 TWEET SUCCESSFULLY PUBLISHED ON X!');
        console.log('======================================================\n');

        return {
            success: true,
            tweetText: tweetText,
            screenshot: confirmationScreenshot
        };
    } catch (error) {
        console.error('❌ Error uploading to X / Twitter:', error.message);
        const errScreenshot = path.join(__dirname, '../../config/twitter_upload_error.png');
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

module.exports = { uploadTwitterPost };

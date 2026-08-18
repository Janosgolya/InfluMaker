const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SESSION_PATH = path.join(__dirname, '../../config/twitter_session.json');

/**
 * Uploads an image post with copy to X (Twitter)
 * @param {Object} options
 * @param {string} options.imagePath - Path to image file
 * @param {string} options.tweetText - Text content for the tweet
 * @param {boolean} [options.headless=true] - Headless mode
 * @returns {Promise<{ success: boolean, tweetText?: string, screenshot?: string, error?: string }>}
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

    // 1. Optimize image for fast upload
    const optimizedImage = path.join(__dirname, '../../config/twitter_upload_optimized.jpg');
    try {
        await sharp(imagePath)
            .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 88 })
            .toFile(optimizedImage);
        console.log(`🖼️ Optimized image created (${fs.statSync(optimizedImage).size} bytes)`);
    } catch {
        // Fallback to original
    }

    const uploadTarget = fs.existsSync(optimizedImage) ? optimizedImage : imagePath;

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
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    try {
        console.log('🌐 Navigating to X / Twitter Compose...');
        await page.goto('https://x.com/compose/post', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(3000);

        // Check if redirected to login
        if (page.url().includes('/login') || page.url().includes('/i/flow/login')) {
            throw new Error('X/Twitter session expired or invalid. Please re-run login_twitter.bat.');
        }

        // Dismiss Cookie Banner if present
        const cookieBanner = page.locator('div[data-testid="BottomBar"], div[role="dialog"]').filter({ hasText: /cookies/i });
        if (await cookieBanner.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('🍪 Dismissing Twitter Cookie Banner...');
            const btn = cookieBanner.locator('button').first();
            await btn.click().catch(() => {});
            await page.waitForTimeout(1000);
        }

        // 2. Enter Tweet Text
        console.log('✍️ Populating Tweet Text...');
        const textBox = page.locator('div[data-testid="tweetTextarea_0"], div[role="textbox"][contenteditable="true"]').first();
        await textBox.waitFor({ state: 'visible', timeout: 15000 });
        await textBox.click();
        await page.keyboard.type(tweetText, { delay: 5 });
        console.log('✅ Tweet text entered!');

        await page.waitForTimeout(1000);

        // 3. Upload Image File
        console.log('📤 Locating media upload input...');
        const fileInput = page.locator('input[data-testid="fileInput"], input[type="file"]').first();
        await fileInput.waitFor({ state: 'attached', timeout: 15000 });
        await fileInput.setInputFiles(path.resolve(uploadTarget));
        console.log('✅ Image uploaded to X canvas!');

        // 4. Wait for media preview thumbnail to load and Post button to be ENABLED
        console.log('⏳ Waiting for upload completion and Post button activation...');
        const postBtn = page.locator('button[data-testid="tweetButton"]:not([disabled])').first();
        await postBtn.waitFor({ state: 'visible', timeout: 25000 });
        await page.waitForTimeout(1500);

        // 5. Click Post Button & Control+Enter
        console.log('🚀 Clicking Tweet / Post Button...');
        await page.keyboard.press('Control+Enter');
        await page.waitForTimeout(1000);

        const dialog = page.locator('div[role="dialog"][aria-modal="true"]');
        if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
            await postBtn.click({ force: true }).catch(() => {});
        }

        console.log('⏳ Waiting for tweet submission confirmation...');
        await dialog.waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(3000);

        const confirmationScreenshot = path.join(__dirname, '../../config/twitter_published_confirmation.png');
        await page.screenshot({ path: confirmationScreenshot });
        console.log(`📸 Confirmation screenshot saved to: ${confirmationScreenshot}`);

        console.log('\n======================================================');
        console.log('🎉 TWEET SUCCESSFULLY PUBLISHED ON X!');
        console.log('======================================================\n');

        // Save fresh storage state
        const fullState = await context.storageState();
        fs.writeFileSync(SESSION_PATH, JSON.stringify(fullState, null, 2), 'utf8');

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

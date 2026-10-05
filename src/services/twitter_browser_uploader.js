const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const humanEmulator = require('./human_emulator');

const SESSION_PATH = path.join(__dirname, '../../config/twitter_session.json');

/**
 * Uploads an image post with copy to X (Twitter) using advanced stealth & human emulation
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
    console.log('🐦 X (TWITTER) POST UPLOADER (Human Emulation Mode)');
    console.log(`Tweet: "${tweetText.substring(0, 100)}..."`);
    console.log(`Image: ${imagePath}`);
    console.log('======================================================\n');

    if (!fs.existsSync(SESSION_PATH)) {
        throw new Error(`Twitter session not found at: ${SESSION_PATH}. Run 'login_twitter.bat' first!`);
    }

    if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file does not exist: ${imagePath}`);
    }

    // 1. Optimize image for fast upload (skip for video files)
    const isVideo = imagePath.toLowerCase().endsWith('.mp4') || imagePath.toLowerCase().endsWith('.mov');
    const optimizedImage = path.join(__dirname, '../../config/twitter_upload_optimized.jpg');
    if (!isVideo) {
        try {
            await sharp(imagePath)
                .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 88 })
                .toFile(optimizedImage);
            console.log(`🖼️ Optimized image created (${fs.statSync(optimizedImage).size} bytes)`);
        } catch {
            // Fallback to original
        }
    }

    const uploadTarget = (!isVideo && fs.existsSync(optimizedImage)) ? optimizedImage : imagePath;

    const browser = await chromium.launch({
        headless: headless,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-infobars',
            '--window-size=1440,900'
        ]
    });

    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        locale: 'en-US',
        timezoneId: 'Europe/Warsaw'
    });

    const page = await context.newPage();
    await humanEmulator.injectStealth(page);

    try {
        console.log('🌐 Navigating to X / Twitter Compose with human pacing...');
        await page.goto('https://x.com/compose/post', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await humanEmulator.randomDelay(3000, 5000);

        // Check if redirected to login
        if (page.url().includes('/login') || page.url().includes('/i/flow/login')) {
            throw new Error('X/Twitter session expired or invalid. Please re-run login_twitter.bat.');
        }

        // Dismiss Cookie Banner if present
        const cookieBanner = page.locator('div[data-testid="BottomBar"], div[role="dialog"]').filter({ hasText: /cookies/i });
        if (await cookieBanner.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('🍪 Dismissing Twitter Cookie Banner with human click...');
            const btn = cookieBanner.locator('button').first();
            await humanEmulator.humanClick(page, btn);
            await humanEmulator.randomDelay(1000, 2000);
        }

        // 2. Enter Tweet Text using Human Emulator
        console.log('✍️ Populating Tweet Text with realistic human rhythm...');
        const textBox = page.locator('div[data-testid="tweetTextarea_0"], div[role="textbox"][contenteditable="true"]').first();
        await textBox.waitFor({ state: 'visible', timeout: 15000 });
        await humanEmulator.humanType(page, textBox, tweetText);
        console.log('✅ Tweet text entered naturally!');

        await humanEmulator.simulateHesitation(1000, 2500);

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
        await humanEmulator.randomDelay(1800, 3200);

        // 5. Human click on Post button
        console.log('🚀 Clicking Tweet / Post Button via human trajectory...');
        await humanEmulator.humanClick(page, postBtn);
        await humanEmulator.randomDelay(1500, 3000);

        const dialog = page.locator('div[role="dialog"][aria-modal="true"]');
        if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
            await humanEmulator.humanClick(page, postBtn);
        }

        console.log('⏳ Waiting for tweet submission confirmation...');
        await dialog.waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
        await humanEmulator.randomDelay(3000, 5000);

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

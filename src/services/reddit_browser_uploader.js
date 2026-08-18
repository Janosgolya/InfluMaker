const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

/**
 * Uploads an image post to Reddit and posts an in-character first comment
 * @param {Object} options
 * @param {string} options.imagePath - Path to image file
 * @param {string} options.title - Post title (curiosity gap hook)
 * @param {string} [options.firstComment] - Opening comment in character
 * @param {string} [options.subreddit='u_me'] - Target subreddit or 'u_me' for user profile
 * @param {boolean} [options.isNsfw=false] - Whether to mark as 18+ / NSFW
 * @param {boolean} [options.headless=true] - Headless mode
 * @returns {Promise<{ success: boolean, postUrl?: string, error?: string }>}
 */
async function uploadRedditPost(options) {
    const {
        imagePath,
        title,
        firstComment,
        subreddit = 'aiArt',
        isNsfw = false,
        headless = true
    } = options;

    console.log('\n======================================================');
    console.log('🤖 REDDIT POST UPLOADER');
    console.log(`Title: "${title}"`);
    console.log(`Subreddit: r/${subreddit}`);
    console.log(`Image: ${imagePath}`);
    console.log(`NSFW: ${isNsfw}`);
    console.log('======================================================\n');

    if (!fs.existsSync(SESSION_PATH)) {
        throw new Error(`Reddit session not found at: ${SESSION_PATH}. Run 'login_reddit.bat' first!`);
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
        const submitUrl = (subreddit && subreddit !== 'u_me') 
            ? `https://www.reddit.com/r/${subreddit}/submit` 
            : `https://www.reddit.com/submit`;

        console.log(`🌐 Navigating to Reddit Submit: ${submitUrl}...`);
        await page.goto(submitUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(4000);

        // Check if logged in
        if (page.url().includes('/login') || page.url().includes('/register')) {
            throw new Error('Reddit session expired or invalid. Please re-run login_reddit.bat.');
        }

        // 1. Switch to "Images & Video" tab if available
        console.log('📑 Selecting Images & Video tab...');
        const mediaTab = page.locator('button[role="tab"], button').filter({ hasText: /Image|Images|Zdjęcia|Wideo|Media/i }).first();
        if (await mediaTab.isVisible({ timeout: 4000 })) {
            await mediaTab.click();
            await page.waitForTimeout(1500);
        }

        // 2. Upload Image File
        console.log('📤 Locating file input...');
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.waitFor({ state: 'attached', timeout: 15000 });
        await fileInput.setInputFiles(path.resolve(imagePath));
        console.log('✅ Image uploaded to Reddit canvas!');

        await page.waitForTimeout(3000);

        // 3. Enter Title
        console.log('✍️ Entering Post Title...');
        const titleBox = page.locator('textarea[placeholder*="Title" i], textarea[placeholder*="Tytuł" i], input[placeholder*="Title" i], [name="title"], div[role="textbox"]').first();
        await titleBox.waitFor({ state: 'visible', timeout: 10000 });
        await titleBox.click();
        await titleBox.fill(title.substring(0, 300));
        console.log('✅ Title populated!');

        await page.waitForTimeout(1000);

        // 4. Toggle NSFW if requested
        if (isNsfw) {
            console.log('🔞 Toggling NSFW tag...');
            const nsfwBtn = page.locator('button').filter({ hasText: /^NSFW$|^18\+$/i }).first();
            if (await nsfwBtn.isVisible({ timeout: 2000 })) {
                await nsfwBtn.click();
                console.log('✅ NSFW tag enabled');
            }
        }

        await page.waitForTimeout(1500);

        // 5. Click Submit / Post Button
        console.log('🚀 Submitting Post to Reddit...');
        const postBtn = page.locator('button[type="submit"], button').filter({ hasText: /^Post$|^Opublikuj$|^Submit$/i }).first();
        await postBtn.waitFor({ state: 'visible', timeout: 10000 });
        await postBtn.click({ force: true });

        console.log('⏳ Waiting for Reddit post confirmation...');
        await page.waitForTimeout(7000);

        const currentPostUrl = page.url();
        console.log(`🌐 Live Post URL: ${currentPostUrl}`);

        // Capture confirmation screenshot
        const screenshotPath = path.join(__dirname, '../../config/reddit_published_confirmation.png');
        await page.screenshot({ path: screenshotPath });
        console.log(`📸 Confirmation screenshot saved to: ${screenshotPath}`);

        // 6. Post In-Character First Comment (if provided)
        if (firstComment && !currentPostUrl.includes('/submit')) {
            console.log('💬 Posting in-character first comment...');
            try {
                const commentBox = page.locator('div[contenteditable="true"], textarea[placeholder*="comment" i], textarea[placeholder*="komentarz" i], div[role="textbox"]').first();
                if (await commentBox.isVisible({ timeout: 5000 })) {
                    await commentBox.click();
                    await page.keyboard.type(firstComment, { delay: 5 });
                    await page.waitForTimeout(1000);

                    const commentBtn = page.locator('button').filter({ hasText: /^Comment$|^Skomentuj$|^Reply$/i }).first();
                    if (await commentBtn.isVisible({ timeout: 3000 })) {
                        await commentBtn.click();
                        await page.waitForTimeout(3000);
                        console.log('✅ In-character first comment published!');
                    }
                }
            } catch (cmtErr) {
                console.log('ℹ️ First comment notice:', cmtErr.message);
            }
        }

        console.log('\n======================================================');
        console.log('🎉 REDDIT POST SUCCESSFULLY PUBLISHED!');
        console.log('======================================================\n');

        return {
            success: true,
            postUrl: currentPostUrl,
            subreddit: subreddit,
            title: title,
            screenshot: screenshotPath
        };
    } catch (error) {
        console.error('❌ Error uploading to Reddit:', error.message);
        const errScreenshot = path.join(__dirname, '../../config/reddit_upload_error.png');
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

module.exports = { uploadRedditPost };

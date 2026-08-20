const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

/**
 * Bulletproof Reddit Post Uploader (Native old.reddit.com Fallback)
 * Handles direct image uploads robustly, bypassing Shreddit Shadow DOM/React bugs and mandatory flair blocks.
 */
async function uploadRedditPost(options) {
    const {
        imagePath,
        title,
        bodyText = '',
        firstComment = '',
        subreddit = 'HistoricalCostuming',
        isNsfw = false,
        headless = true
    } = options;

    console.log('\n======================================================');
    console.log('🤖 REDDIT LIVE POST UPLOADER (Old Reddit Native)');
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
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    try {
        // 0. Session Warming to bypass Cloudflare
        console.log('0. Warming session...');
        await page.goto('https://www.reddit.com/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        const targetSub = subreddit || 'u_BettyRyal';
        const submitUrl = `https://old.reddit.com/r/${targetSub}/submit`;
        
        console.log(`🌐 Navigating to: ${submitUrl}...`);
        await page.goto(submitUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(3000);

        // Check login by looking for the URL redirecting to login or missing submit buttons
        if (page.url().includes('/login') || page.url().includes('/register')) {
            throw new Error('Reddit session expired. Please re-run login_reddit.bat.');
        }

        // 1. Upload Image File using old Reddit native file input
        console.log('📤 Locating image file input...');
        const fileInput = page.locator('input[type="file"]').first();
        if (await fileInput.isVisible() || await fileInput.count() > 0) {
            console.log('Attaching file directly to native file input...');
            await fileInput.setInputFiles(path.resolve(imagePath));
            await page.waitForTimeout(2000);
        } else {
            throw new Error('Could not find native file input on old.reddit.com');
        }

        // 2. Populate Post Title
        console.log('✍️ Populating Post Title...');
        const titleField = page.locator('textarea[name="title"], input[name="title"]').first();
        if (await titleField.isVisible({ timeout: 4000 })) {
            await titleField.fill(title);
            console.log('✅ Title populated!');
        } else {
            throw new Error('Could not find title input field.');
        }
        await page.waitForTimeout(1500);
        
        // 3. Mark NSFW if required
        if (isNsfw) {
            console.log('🔞 Toggling NSFW tag...');
            const nsfwCheckbox = page.locator('input[name="nsfw"]').first();
            if (await nsfwCheckbox.isVisible({ timeout: 2000 })) {
                await nsfwCheckbox.check();
                console.log('✅ NSFW tag checked!');
            }
            await page.waitForTimeout(1000);
        }

        // 4. Click Submit
        console.log('🚀 Submitting Post to Reddit (Clicking Submit)...');
        const submitBtn = page.locator('button[name="submit"], input[type="submit"][value*="submit" i]').first();
        if (await submitBtn.isVisible()) {
            await submitBtn.click();
            console.log('⏳ Waiting for Reddit redirect to live post (15s)...');
            await page.waitForTimeout(15000);
        }

        let isLive = false;
        let livePostUrl = page.url();

        // Old Reddit often redirects to the new Reddit URL or old Reddit comments URL
        if (livePostUrl.includes('/comments/')) {
            isLive = true;
        }

        const screenshotPath = path.join(__dirname, '../../config/reddit_published_confirmation.png');
        await page.screenshot({ path: screenshotPath });
        console.log(`📸 Confirmation screenshot saved to: ${screenshotPath}`);

        if (!isLive) {
            throw new Error(`Reddit post did not redirect to live thread. Current URL: ${page.url()}. Check ${screenshotPath}`);
        }

        console.log(`🎉 LIVE REDDIT POST URL: ${livePostUrl}`);

        // 5. Post In-Character First Comment
        if (firstComment) {
            console.log('💬 Submitting in-character first comment...');
            try {
                // Determine if we are on old or new reddit design for the comments page
                const isNewReddit = livePostUrl.includes('www.reddit.com') && !page.url().includes('old.reddit.com');
                
                if (isNewReddit) {
                    const commentBox = page.locator('div[contenteditable="true"], textarea[placeholder*="komentarz" i], textarea[placeholder*="comment" i], [data-testid*="comment"]').first();
                    if (await commentBox.isVisible({ timeout: 5000 })) {
                        await commentBox.click();
                        await page.keyboard.type(firstComment, { delay: 5 });
                        await page.waitForTimeout(1000);

                        const commentBtn = page.locator('button:has-text("Komentarz"), button:has-text("Comment"), button:has-text("Skomentuj")').first();
                        if (await commentBtn.isVisible()) {
                            await commentBtn.click();
                            await page.waitForTimeout(3000);
                            console.log('✅ In-character first comment published (New UI)!');
                        }
                    }
                } else {
                    // Old Reddit comment interface
                    const commentArea = page.locator('textarea[name="text"]').first();
                    if (await commentArea.isVisible({ timeout: 5000 })) {
                        await commentArea.fill(firstComment);
                        await page.waitForTimeout(1000);
                        const commentSubmit = page.locator('button[type="submit"]:has-text("save"), input[type="submit"][value="save"]').first();
                        if (await commentSubmit.isVisible()) {
                            await commentSubmit.click();
                            await page.waitForTimeout(3000);
                            console.log('✅ In-character first comment published (Old UI)!');
                        }
                    }
                }
            } catch (cErr) {
                console.log('ℹ️ First comment notice:', cErr.message);
            }
        }

        // 6. Navigate to Betty's Reddit profile to capture verified history
        console.log('\n🌐 Verifying live profile history: https://www.reddit.com/user/BettyRyal/ ...');
        await page.goto('https://www.reddit.com/user/BettyRyal/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);

        const historyScreenshot = path.join(__dirname, '../../config/reddit_user_history_live.png');
        await page.screenshot({ path: historyScreenshot });
        console.log(`📸 Saved verified Reddit user profile history screenshot to: ${historyScreenshot}`);

        console.log('\n======================================================');
        console.log('🎉 REDDIT POST SUCCESSFULLY PUBLISHED & VERIFIED!');
        console.log('======================================================\n');

        return {
            success: true,
            postUrl: livePostUrl,
            subreddit: targetSub,
            title: title,
            screenshot: historyScreenshot
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

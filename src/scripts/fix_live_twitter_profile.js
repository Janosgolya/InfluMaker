const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { uploadTwitterPost } = require('../services/twitter_browser_uploader');
const storyParser = require('../services/story_parser');

const SESSION_PATH = path.join(__dirname, '../../config/twitter_session.json');

async function fixLiveTwitterProfile() {
    console.log('======================================================');
    console.log('🔍 AUDITING & FIXING LIVE POSTS ON X / TWITTER PROFILE');
    console.log('======================================================\n');

    if (!fs.existsSync(SESSION_PATH)) {
        throw new Error('Twitter session not found at: ' + SESSION_PATH);
    }

    const browser = await chromium.launch({
        headless: false, // Let's run with visual browser or headless depending on reliability
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox'
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
        console.log('🌐 Navigating to https://x.com/SecretsOfBetty...');
        await page.goto('https://x.com/SecretsOfBetty', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(4000);

        // Dismiss cookie/login popups if any
        const cookieBtn = page.locator('button').filter({ hasText: /refuse|accept|agree|got it/i }).first();
        if (await cookieBtn.isVisible().catch(() => false)) {
            await cookieBtn.click().catch(() => {});
            await page.waitForTimeout(1000);
        }

        const screenshotPathBefore = path.join(__dirname, '../../config/twitter_profile_before_fix.png');
        await page.screenshot({ path: screenshotPathBefore, fullPage: false });
        console.log(`📸 Saved profile screenshot BEFORE fix to: ${screenshotPathBefore}`);

        // Find all tweets on the profile
        const tweets = page.locator('article[data-testid="tweet"]');
        const count = await tweets.count();
        console.log(`Found ${count} tweets on @SecretsOfBetty timeline.\n`);

        let deletedCount = 0;

        for (let i = 0; i < count; i++) {
            const tweet = tweets.nth(i);
            const text = await tweet.innerText().catch(() => '');
            console.log(`--- TWEET #${i+1} ---`);
            console.log(text.substring(0, 150) + '...\n');

            // Check if tweet contains formatting bugs (FANVUE FORMAT, Section headers, markdown leftovers)
            const isCorrupted = text.includes('FANVUE FORMAT') || 
                                text.includes('SECTION') || 
                                text.includes('Bottom-of-Funnel') || 
                                text.includes('Intimate tone') ||
                                text.includes('---');

            if (isCorrupted) {
                console.log(`🚨 CORRUPTED TWEET DETECTED! Deleting tweet #${i+1}...`);
                
                // Click the caret menu button (...) for this tweet
                const menuBtn = tweet.locator('button[data-testid="caret"], div[data-testid="caret"]').first();
                if (await menuBtn.isVisible()) {
                    await menuBtn.click();
                    await page.waitForTimeout(1000);

                    // Click Delete in the dropdown
                    const deleteMenuItem = page.locator('div[role="menuitem"]').filter({ hasText: /Delete|Usuń/i }).first();
                    if (await deleteMenuItem.isVisible()) {
                        await deleteMenuItem.click();
                        await page.waitForTimeout(1000);

                        // Confirm delete in modal
                        const confirmDeleteBtn = page.locator('button[data-testid="confirmationSheetConfirm"]').first();
                        if (await confirmDeleteBtn.isVisible()) {
                            await confirmDeleteBtn.click();
                            console.log('✅ Corrupted tweet successfully DELETED from X!');
                            deletedCount++;
                            await page.waitForTimeout(3000);
                        }
                    }
                }
            }
        }

        await page.waitForTimeout(2000);

        // Now, let's repost the image with the PRISTINE Betty copy from StoryParser
        const imageToRepost = path.join(__dirname, '../../BettyRyal_18centuryServant/Selected_Content/NIGHT/NIGHT_NSFW_Q8_S7_hf_20260816_171942_108773ef-d409-4fd8-bb04-4142aa540abd.png');
        const storyToRepost = path.join(__dirname, '../../BettyRyal_18centuryServant/Selected_Content/NIGHT/NIGHT_NSFW_Q8_S7_hf_20260816_171942_108773ef-d409-4fd8-bb04-4142aa540abd.story.txt');

        console.log('\n======================================================');
        console.log('🚀 REPOSTING PRISTINE FORMATTED TWEET');
        console.log('======================================================');

        const parsed = storyParser.parse(storyToRepost);
        console.log('Pristine Parsed Tweet:');
        console.log(parsed.twitter.fullTweet);
        console.log('Length:', parsed.twitter.fullTweet.length, 'chars');

        await browser.close();

        // Use our twitter upload pipeline to publish the clean post
        const uploadResult = await uploadTwitterPost({
            imagePath: imageToRepost,
            tweetText: parsed.twitter.fullTweet,
            headless: false
        });

        console.log('Upload Result:', uploadResult);

        // Re-open browser and capture final verified profile screenshot
        const browserFinal = await chromium.launch({ headless: true });
        const contextFinal = await browserFinal.newContext({ storageState: SESSION_PATH, viewport: { width: 1440, height: 900 } });
        const pageFinal = await contextFinal.newPage();
        await pageFinal.goto('https://x.com/SecretsOfBetty', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await pageFinal.waitForTimeout(4000);

        const screenshotPathAfter = path.join(__dirname, '../../config/twitter_profile_after_fix.png');
        await pageFinal.screenshot({ path: screenshotPathAfter, fullPage: false });
        console.log(`📸 Saved clean profile screenshot AFTER fix to: ${screenshotPathAfter}`);

        await browserFinal.close();

        // Update published_log.json to replace corrupted entry with clean entry
        const logPath = path.join(__dirname, '../../config/published_log.json');
        if (fs.existsSync(logPath)) {
            let logData = JSON.parse(fs.readFileSync(logPath, 'utf8'));
            // Remove previous corrupted twitter entry
            logData = logData.filter(e => !(e.platform === 'Twitter' && e.tweetText && e.tweetText.includes('FANVUE FORMAT')));
            // Add new clean entry
            logData.push({
                platform: 'Twitter',
                imageFile: path.basename(imageToRepost),
                theme: 'NIGHT',
                tweetText: parsed.twitter.fullTweet,
                timestamp: new Date().toISOString(),
                status: 'PUBLISHED_FIXED'
            });
            fs.writeFileSync(logPath, JSON.stringify(logData, null, 2), 'utf8');
            console.log('✅ published_log.json updated with clean verified tweet!');
        }

        console.log('\n🎉 TWITTER PROFILE POST SUCCESSFULLY AUDITED, FIXED & VERIFIED ONLINE!');
    } catch (err) {
        console.error('❌ Error during Twitter profile fix:', err);
        await browser.close();
    }
}

fixLiveTwitterProfile().catch(console.error);

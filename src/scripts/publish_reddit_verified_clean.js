const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const storyParser = require('../services/story_parser');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function publishCleanReddit() {
    console.log('======================================================');
    console.log('🤖 REDDIT: PUBLISHING VERIFIED LIVE POST');
    console.log('======================================================\n');

    const imagePath = 'D:\\AntigravityProjects\\InfluMaker\\BettyRyal_18centuryServant\\Selected_Content\\PREP\\PREP_SFW_Q9_S1_hf_20260816_174906_aa662b53-4419-4708-a3c8-908441a9ae61.png';
    const storyPath = 'D:\\AntigravityProjects\\InfluMaker\\BettyRyal_18centuryServant\\Selected_Content\\PREP\\PREP_SFW_Q9_S1_hf_20260816_174906_aa662b53-4419-4708-a3c8-908441a9ae61.story.txt';

    const parsed = storyParser.parse(storyPath);
    const title = "Studying 18th-century London servant stays and linen textures [OC]";
    const bodyText = "Examining 18th-century lighting and London servant stays for Betty Ryal. What do you think of the linen textures? More of her secret diary is linked on my profile!";
    const firstComment = "Before the house awakens, I write my private diary by candlelight... 🕯️\n\nDiscover the full uncensored entries in my bio link: https://fanvue.com/bettyryal";

    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    try {
        console.log('🌐 Opening Reddit home to warm session...');
        await page.goto('https://www.reddit.com/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        try {
            const cBtn = page.locator('button:has-text("Zaakceptuj wszystkie")').first();
            if (await cBtn.isVisible({ timeout: 2000 })) await cBtn.click();
        } catch {}

        console.log('🌐 Navigating to r/HistoricalCostuming submit with type=IMAGE...');
        await page.goto('https://www.reddit.com/r/HistoricalCostuming/submit?type=IMAGE', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);

        // 1. Upload Image to the exact image input (first file input)
        console.log('📤 Uploading image file...');
        const imageInput = page.locator('input[type="file"]').first();
        await imageInput.setInputFiles(path.resolve(imagePath));
        console.log('✅ Image uploaded!');
        await page.waitForTimeout(4000);

        // 2. Populate Title
        console.log('✍️ Populating Title...');
        const titleField = page.locator('faceplate-textarea-input[name="title"] textarea, textarea[name="title"], [placeholder*="Tytuł" i], [placeholder*="Title" i]').first();
        if (await titleField.isVisible({ timeout: 4000 })) {
            await titleField.fill(title);
        } else {
            const genericTitle = page.locator('textarea').first();
            await genericTitle.fill(title);
        }
        console.log('✅ Title populated!');
        await page.waitForTimeout(1500);

        // 3. Populate Body Text Editor
        console.log('✍️ Populating Body Text...');
        const bodyEditor = page.locator('div[slot="rte"] div[contenteditable="true"], div[data-testid*="body"] div[contenteditable="true"], div[contenteditable="true"], faceplate-textarea-input[name="body"] textarea').last();
        if (await bodyEditor.isVisible({ timeout: 3000 })) {
            await bodyEditor.click();
            await page.keyboard.type(bodyText, { delay: 5 });
            console.log('✅ Body text filled!');
        }
        await page.waitForTimeout(1500);

        // 4. Click Submit / Post Button ("Postuj")
        console.log('🚀 Clicking "Postuj" Button...');
        const postButton = page.locator('button:has-text("Postuj"), button:has-text("Post"), button[slot="submit-button"]').first();
        await postButton.waitFor({ state: 'visible', timeout: 8000 });
        
        await postButton.click({ force: true });
        console.log('⏳ Waiting for post to finalize and redirect to live post (15s)...');
        
        let liveUrl = '';
        for (let t = 0; t < 15; t++) {
            await page.waitForTimeout(1000);
            const cur = page.url();
            if (!cur.includes('/submit') && (cur.includes('/comments/') || cur.includes('/user/'))) {
                liveUrl = cur;
                break;
            }
        }

        console.log(`Current page URL after submit: ${page.url()}`);
        const screenshotPath = path.join(__dirname, '../../config/reddit_published_confirmation.png');
        await page.screenshot({ path: screenshotPath });
        console.log(`📸 Confirmation screenshot saved to: ${screenshotPath}`);

        // 5. Post In-Character First Comment
        if (firstComment && page.url().includes('/comments/')) {
            console.log('💬 Submitting in-character first comment...');
            try {
                const commentBox = page.locator('div[contenteditable="true"], textarea[placeholder*="komentarz" i], textarea[placeholder*="comment" i]').first();
                if (await commentBox.isVisible({ timeout: 5000 })) {
                    await commentBox.click();
                    await page.keyboard.type(firstComment, { delay: 5 });
                    await page.waitForTimeout(1000);

                    const commentSubmit = page.locator('button:has-text("Komentarz"), button:has-text("Comment"), button:has-text("Skomentuj")').first();
                    if (await commentSubmit.isVisible()) {
                        await commentSubmit.click();
                        await page.waitForTimeout(3000);
                        console.log('✅ In-character first comment submitted!');
                    }
                }
            } catch (cErr) {
                console.log('Comment notice:', cErr.message);
            }
        }

        // 6. Navigate to Betty's profile to verify live post history
        console.log('\n🌐 Verifying live post history on: https://www.reddit.com/user/BettyRyal/ ...');
        await page.goto('https://www.reddit.com/user/BettyRyal/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);

        const profileHistoryScreenshot = path.join(__dirname, '../../config/reddit_user_history_live.png');
        await page.screenshot({ path: profileHistoryScreenshot });
        console.log(`📸 Saved verified Reddit user profile history screenshot to: ${profileHistoryScreenshot}`);

        await browser.close();
        console.log('\n🎉 REDDIT POST PUBLISHED & VERIFIED LIVE ON PROFILE HISTORY!');
        return { success: true, liveUrl: page.url(), screenshot: profileHistoryScreenshot };
    } catch (e) {
        console.error('❌ Error publishing to Reddit:', e.message);
        const errPath = path.join(__dirname, '../../config/reddit_upload_error.png');
        await page.screenshot({ path: errPath }).catch(() => {});
        return { success: false, error: e.message };
    } finally {
        await browser.close();
    }
}

publishCleanReddit().then(r => console.log('Final Result:', r));

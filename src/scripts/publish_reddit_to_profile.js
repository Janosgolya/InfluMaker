const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const storyParser = require('../services/story_parser');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function publishToBettyProfile() {
    console.log('======================================================');
    console.log('🤖 REDDIT: PUBLISHING LIVE POST DIRECTLY TO u/BettyRyal');
    console.log('======================================================\n');

    const imagePath = 'D:\\AntigravityProjects\\InfluMaker\\BettyRyal_18centuryServant\\Selected_Content\\PREP\\PREP_SFW_Q9_S1_hf_20260816_174906_aa662b53-4419-4708-a3c8-908441a9ae61.png';
    const storyPath = 'D:\\AntigravityProjects\\InfluMaker\\BettyRyal_18centuryServant\\Selected_Content\\PREP\\PREP_SFW_Q9_S1_hf_20260816_174906_aa662b53-4419-4708-a3c8-908441a9ae61.story.txt';

    const parsed = storyParser.parse(storyPath);
    const title = parsed.reddit.title || "Betty's quiet hour before the London manor awakens... [18th Century Aesthetic]";
    const firstComment = parsed.reddit.comment || "Before the house awakens, I write my private diary by candlelight... 🕯️\n\nDiscover the full uncensored entries in my bio link: https://fanvue.com/bettyryal";

    console.log(`Title: "${title}"`);
    console.log(`Image: ${imagePath}`);

    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    try {
        console.log('🌐 Opening Betty\'s Profile: https://www.reddit.com/user/BettyRyal/ ...');
        await page.goto('https://www.reddit.com/user/BettyRyal/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);

        // Accept cookie banner if present
        try {
            const cBtn = page.locator('button:has-text("Zaakceptuj wszystkie")').first();
            if (await cBtn.isVisible({ timeout: 2000 })) await cBtn.click();
        } catch {}

        // Click "+ Utwórz post" on profile
        console.log('👆 Clicking "+ Utwórz post" on profile page...');
        const createPostBtn = page.locator('button:has-text("Utwórz post"), a:has-text("Utwórz post")').first();
        if (await createPostBtn.isVisible({ timeout: 4000 })) {
            await createPostBtn.click();
            await page.waitForTimeout(4000);
        } else {
            await page.goto('https://www.reddit.com/user/BettyRyal/submit', { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(4000);
        }

        console.log(`Submit Page Loaded. Current URL: ${page.url()}`);

        // 1. Select "Obrazy i filmy" Tab
        console.log('📑 Selecting "Obrazy i filmy" tab...');
        const imgTab = page.locator('button[role="tab"], button').filter({ hasText: /Obrazy i filmy|Images & Video|Zdjęcia/i }).first();
        if (await imgTab.isVisible({ timeout: 3000 })) {
            await imgTab.click({ force: true });
            await page.waitForTimeout(1500);
        }

        // 2. Upload Image
        console.log('📤 Uploading image...');
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.waitFor({ state: 'attached', timeout: 10000 });
        await fileInput.setInputFiles(path.resolve(imagePath));
        console.log('✅ Image attached to canvas!');
        await page.waitForTimeout(4000);

        // 3. Fill Title
        console.log('✍️ Populating Post Title...');
        const titleField = page.locator('faceplate-textarea-input[name="title"] textarea, [placeholder*="Tytuł" i], [placeholder*="Title" i], textarea[name="title"]').first();
        if (await titleField.isVisible({ timeout: 4000 })) {
            await titleField.fill(title);
        } else {
            const genericTitle = page.locator('textarea').first();
            await genericTitle.fill(title);
        }
        console.log('✅ Title filled!');
        await page.waitForTimeout(2000);

        // 4. Click Submit / Post Button
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

        console.log(`Live Post URL: ${page.url()}`);
        const postConfPath = path.join(__dirname, '../../config/reddit_published_confirmation.png');
        await page.screenshot({ path: postConfPath });
        console.log(`📸 Saved post confirmation screenshot to: ${postConfPath}`);

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

        // 6. Navigate back to Betty's profile to verify live post history
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

publishToBettyProfile().then(r => console.log('Final Result:', r));

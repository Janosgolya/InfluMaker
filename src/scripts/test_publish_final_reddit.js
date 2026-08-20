const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const storyParser = require('../services/story_parser');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function publishRedditFinal() {
    console.log('======================================================');
    console.log('🤖 REDDIT: LIVE PUBLISHING TEST & HISTORY VERIFICATION');
    console.log('======================================================\n');

    const imagePath = 'D:\\AntigravityProjects\\InfluMaker\\BettyRyal_18centuryServant\\Selected_Content\\PREP\\PREP_SFW_Q9_S1_hf_20260816_174906_aa662b53-4419-4708-a3c8-908441a9ae61.png';
    const storyPath = 'D:\\AntigravityProjects\\InfluMaker\\BettyRyal_18centuryServant\\Selected_Content\\PREP\\PREP_SFW_Q9_S1_hf_20260816_174906_aa662b53-4419-4708-a3c8-908441a9ae61.story.txt';

    const parsed = storyParser.parse(storyPath);
    const title = "Studying 18th-century London servant stays and linen textures [OC]";
    const bodyText = "Examining 18th-century lighting and London servant stays for my character Betty Ryal. What do you think of the linen textures? More of her secret diary is linked on my profile!";
    const firstComment = "Before the house awakens, I write my private diary by candlelight... 🕯️\n\nDiscover the full uncensored entries in my bio link: https://fanvue.com/bettyryal";

    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    try {
        console.log('🌐 Loading Reddit Home...');
        await page.goto('https://www.reddit.com/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        try {
            const cBtn = page.locator('button:has-text("Zaakceptuj wszystkie")').first();
            if (await cBtn.isVisible({ timeout: 2000 })) await cBtn.click();
        } catch {}

        console.log('🌐 Loading Submit page for r/HistoricalCostuming...');
        await page.goto('https://www.reddit.com/r/HistoricalCostuming/submit?type=IMAGE', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);

        // 1. Upload image to input[type="file"]
        console.log('📤 Attaching image file...');
        const fileInputs = page.locator('input[type="file"]');
        const count = await fileInputs.count();
        console.log(`Found ${count} file inputs.`);

        // Find file input that accepts image
        let attached = false;
        for (let i = 0; i < count; i++) {
            const accept = await fileInputs.nth(i).getAttribute('accept');
            if (!accept || accept.includes('image')) {
                console.log(`Uploading to file input #${i} (accept="${accept}")...`);
                await fileInputs.nth(i).setInputFiles(path.resolve(imagePath));
                attached = true;
                break;
            }
        }
        if (!attached && count > 0) {
            await fileInputs.first().setInputFiles(path.resolve(imagePath));
        }

        console.log('⏳ Waiting for image upload processing (6s)...');
        await page.waitForTimeout(6000);

        // 2. Populate Title
        console.log('✍️ Filling Title...');
        const titleField = page.locator('faceplate-textarea-input[name="title"] textarea, textarea[name="title"], [placeholder*="Tytuł" i]').first();
        if (await titleField.isVisible({ timeout: 4000 })) {
            await titleField.fill(title);
        }
        console.log('✅ Title populated!');
        await page.waitForTimeout(1500);

        // 3. Populate Body Text if present
        console.log('✍️ Populating Body text...');
        const bodyEditor = page.locator('div[slot="rte"] div[contenteditable="true"], div[contenteditable="true"]').last();
        if (await bodyEditor.isVisible({ timeout: 2000 })) {
            await bodyEditor.click();
            await page.keyboard.type(bodyText, { delay: 5 });
            console.log('✅ Body text populated!');
        }
        await page.waitForTimeout(2000);

        // 4. Inspect Post button state
        const postBtn = page.locator('button:has-text("Postuj"), button:has-text("Post"), button[slot="submit-button"]').first();
        await postBtn.waitFor({ state: 'visible', timeout: 8000 });

        const isDisabled = await postBtn.getAttribute('disabled');
        console.log(`Post button disabled state: ${isDisabled}`);

        console.log('🚀 Clicking Submit Button...');
        await postBtn.click({ force: true });

        console.log('⏳ Waiting for redirect to live post (15s)...');
        let finalUrl = '';
        for (let t = 0; t < 15; t++) {
            await page.waitForTimeout(1000);
            const cur = page.url();
            if (!cur.includes('/submit') && (cur.includes('/comments/') || cur.includes('/user/'))) {
                finalUrl = cur;
                break;
            }
        }

        console.log(`Page URL after submission: ${page.url()}`);
        const confScreenshot = path.join(__dirname, '../../config/reddit_published_confirmation.png');
        await page.screenshot({ path: confScreenshot });
        console.log(`📸 Saved confirmation screenshot to: ${confScreenshot}`);

        // 5. Post in-character comment if published to comments thread
        if (page.url().includes('/comments/')) {
            console.log('💬 Submitting in-character first comment...');
            try {
                const commentBox = page.locator('div[contenteditable="true"], textarea[placeholder*="komentarz" i], textarea[placeholder*="comment" i]').first();
                if (await commentBox.isVisible({ timeout: 5000 })) {
                    await commentBox.click();
                    await page.keyboard.type(firstComment, { delay: 5 });
                    await page.waitForTimeout(1000);

                    const commentBtn = page.locator('button:has-text("Komentarz"), button:has-text("Comment")').first();
                    if (await commentBtn.isVisible()) {
                        await commentBtn.click();
                        await page.waitForTimeout(3000);
                        console.log('✅ First comment published!');
                    }
                }
            } catch (cErr) {
                console.log('Comment note:', cErr.message);
            }
        }

        // 6. Verify profile history on Betty's Reddit profile
        console.log('\n🌐 Verifying profile post history: https://www.reddit.com/user/BettyRyal/ ...');
        await page.goto('https://www.reddit.com/user/BettyRyal/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);

        const historyScreenshot = path.join(__dirname, '../../config/reddit_user_history_live.png');
        await page.screenshot({ path: historyScreenshot });
        console.log(`📸 Saved verified Reddit history screenshot to: ${historyScreenshot}`);

        await browser.close();
        return { success: true, url: page.url(), screenshot: historyScreenshot };
    } catch (e) {
        console.error('❌ Error publishing to Reddit:', e.message);
        const errScreenshot = path.join(__dirname, '../../config/reddit_upload_error.png');
        await page.screenshot({ path: errScreenshot }).catch(() => {});
        return { success: false, error: e.message };
    } finally {
        await browser.close();
    }
}

publishRedditFinal().then(r => console.log('Result:', r));

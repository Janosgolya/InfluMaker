const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const storyParser = require('../services/story_parser');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function publishRedditNative() {
    console.log('======================================================');
    console.log('🤖 REDDIT: PUBLISHING LIVE POST WITH VERIFIED CONFIRMATION');
    console.log('======================================================\n');

    const imagePath = 'D:\\AntigravityProjects\\InfluMaker\\BettyRyal_18centuryServant\\Selected_Content\\PREP\\PREP_SFW_Q9_S1_hf_20260816_174906_aa662b53-4419-4708-a3c8-908441a9ae61.png';
    const storyPath = 'D:\\AntigravityProjects\\InfluMaker\\BettyRyal_18centuryServant\\Selected_Content\\PREP\\PREP_SFW_Q9_S1_hf_20260816_174906_aa662b53-4419-4708-a3c8-908441a9ae61.story.txt';

    const parsed = storyParser.parse(storyPath);
    const title = parsed.reddit.title || "Betty's quiet hour before the London manor awakens... [18th Century Aesthetic]";
    const comment = parsed.reddit.comment || "Before the house awakens, I write my private diary by candlelight... 🕯️ Full uncensored diary on https://fanvue.com/bettyryal";

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
        console.log('🌐 Opening Reddit Submit Page...');
        await page.goto('https://www.reddit.com/submit', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);

        // 0. Dismiss cookies
        try {
            const cBtn = page.locator('button:has-text("Zaakceptuj wszystkie")').first();
            if (await cBtn.isVisible({ timeout: 2000 })) await cBtn.click();
        } catch {}

        // 1. Choose Community (Select Profile: u/SecretsOfBetty)
        console.log('📁 Selecting Destination Community / Profile...');
        const commDropdown = page.locator('button:has-text("Wybierz społeczność"), [aria-label*="społeczność" i], button[data-testid*="community"]').first();
        if (await commDropdown.isVisible({ timeout: 4000 })) {
            await commDropdown.click();
            await page.waitForTimeout(1500);

            // Select user profile option
            const profileOption = page.locator('div[role="option"], div[role="menuitem"], li, button').filter({ hasText: /SecretsOfBetty|Twój profil|u\/|Profil/i }).first();
            if (await profileOption.isVisible({ timeout: 2000 })) {
                await profileOption.click();
                console.log('✅ Clicked profile option!');
            }
            await page.waitForTimeout(1000);
            await page.keyboard.press('Escape'); // Ensure menu closes
        }

        await page.waitForTimeout(2000);

        // 2. Select Images Tab ("Obrazy i filmy")
        console.log('📑 Selecting Images and Video tab...');
        const imgTab = page.locator('button[role="tab"], button').filter({ hasText: /Obrazy i filmy|Images & Video|Zdjęcia/i }).first();
        if (await imgTab.isVisible({ timeout: 3000 })) {
            await imgTab.click({ force: true });
            await page.waitForTimeout(1500);
        }

        // 3. Upload File
        console.log('📤 Uploading image...');
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.waitFor({ state: 'attached', timeout: 10000 });
        await fileInput.setInputFiles(path.resolve(imagePath));
        console.log('✅ Image uploaded!');
        await page.waitForTimeout(4000);

        // 4. Fill Title
        console.log('✍️ Filling Title...');
        const titleField = page.locator('faceplate-textarea-input[name="title"] textarea, [placeholder*="Tytuł" i], [placeholder*="Title" i], textarea[name="title"]').first();
        if (await titleField.isVisible({ timeout: 4000 })) {
            await titleField.fill(title);
        } else {
            const genericTitle = page.locator('textarea').first();
            await genericTitle.fill(title);
        }
        console.log('✅ Title populated!');

        await page.waitForTimeout(2000);

        // 5. Click Submit / Post Button ("Postuj" / "Post")
        console.log('🚀 Submitting Post (Clicking Postuj)...');
        const postButton = page.locator('button:has-text("Postuj"), button:has-text("Post"), button[slot="submit-button"]').first();
        await postButton.waitFor({ state: 'visible', timeout: 8000 });
        
        await postButton.click({ force: true });
        console.log('⏳ Waiting for Reddit redirect to published post (15s)...');
        
        let liveUrl = '';
        for (let t = 0; t < 15; t++) {
            await page.waitForTimeout(1000);
            const cur = page.url();
            if (!cur.includes('/submit') && (cur.includes('/comments/') || cur.includes('/user/'))) {
                liveUrl = cur;
                break;
            }
        }

        const screenshotPath = path.join(__dirname, '../../config/reddit_published_confirmation.png');
        await page.screenshot({ path: screenshotPath });
        console.log(`📸 Confirmation screenshot saved to: ${screenshotPath}`);

        console.log(`Current page URL after submit: ${page.url()}`);

        // Check user history on profile
        console.log('\n🌐 Checking Reddit profile history: https://www.reddit.com/user/SecretsOfBetty/ ...');
        await page.goto('https://www.reddit.com/user/SecretsOfBetty/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);

        const historyScreenshot = path.join(__dirname, '../../config/reddit_user_history_live.png');
        await page.screenshot({ path: historyScreenshot });
        console.log(`📸 Saved verified Reddit user profile history screenshot to: ${historyScreenshot}`);

        return { success: true, liveUrl: page.url(), screenshot: historyScreenshot };
    } catch (e) {
        console.error('❌ Error publishing to Reddit:', e.message);
        const errPath = path.join(__dirname, '../../config/reddit_upload_error.png');
        await page.screenshot({ path: errPath }).catch(() => {});
        return { success: false, error: e.message };
    } finally {
        await browser.close();
    }
}

publishRedditNative().then(r => console.log('Final Result:', r));

const { chromium } = require('playwright');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function publishProfileDirect() {
    console.log('======================================================');
    console.log('🚀 PUBLISHING LIVE POST TO u/BettyRyal PROFILE');
    console.log('======================================================\n');

    const imagePath = 'D:\\AntigravityProjects\\InfluMaker\\BettyRyal_18centuryServant\\Selected_Content\\PREP\\PREP_SFW_Q9_S1_hf_20260816_174906_aa662b53-4419-4708-a3c8-908441a9ae61.png';
    const title = "My quiet hour before the London manor awakens... 🕯️ [18th Century Aesthetic]";
    const bodyText = "Before the household stirs, I write my secret thoughts in the kitchen corner. Full diary is linked in my bio!";
    const firstComment = "Before the house awakens, I write my private diary by candlelight... 🕯️\n\nDiscover the full uncensored entries in my bio link: https://fanvue.com/bettyryal";

    const browser = await chromium.launch({
        headless: true,
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
    });
    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    try {
        console.log('1. Navigating to Reddit home...');
        await page.goto('https://www.reddit.com/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        try {
            const cBtn = page.locator('button:has-text("Zaakceptuj wszystkie")').first();
            if (await cBtn.isVisible({ timeout: 2000 })) await cBtn.click();
        } catch {}

        console.log('2. Opening Betty\'s profile...');
        await page.goto('https://www.reddit.com/user/BettyRyal/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        console.log('3. Clicking "+ Utwórz post" on profile...');
        const createBtn = page.locator('button:has-text("Utwórz post"), a:has-text("Utwórz post")').first();
        if (await createBtn.isVisible({ timeout: 4000 })) {
            await createBtn.click();
        } else {
            await page.goto('https://www.reddit.com/user/BettyRyal/submit', { waitUntil: 'domcontentloaded' });
        }
        await page.waitForTimeout(4000);

        console.log(`Submit Page Loaded. Current URL: ${page.url()}`);

        // Select "Obrazy i filmy" tab
        console.log('4. Switching to "Obrazy i filmy" tab...');
        const tab = page.locator('button[role="tab"]').filter({ hasText: /Obrazy i filmy|Images & Video|Zdjęcia/i }).first();
        if (await tab.isVisible({ timeout: 3000 })) {
            await tab.click();
            await page.waitForTimeout(2000);
        }

        // Attach Image
        console.log('5. Uploading image...');
        const fileInputs = page.locator('input[type="file"]');
        const count = await fileInputs.count();
        console.log(`Found ${count} file inputs.`);

        for (let i = 0; i < count; i++) {
            const accept = await fileInputs.nth(i).getAttribute('accept');
            if (!accept || accept.includes('image')) {
                console.log(`Uploading to input #${i} (accept="${accept}")...`);
                await fileInputs.nth(i).setInputFiles(path.resolve(imagePath));
                break;
            }
        }
        await page.waitForTimeout(5000);

        // Fill Title
        console.log('6. Filling Title...');
        const titleField = page.locator('faceplate-textarea-input[name="title"] textarea, textarea[name="title"], [placeholder*="Tytuł" i]').first();
        if (await titleField.isVisible({ timeout: 4000 })) {
            await titleField.fill(title);
        }
        await page.waitForTimeout(1500);

        // Fill Body
        console.log('7. Filling Body text...');
        const bodyEditor = page.locator('div[slot="rte"] div[contenteditable="true"], div[contenteditable="true"]').last();
        if (await bodyEditor.isVisible({ timeout: 2000 })) {
            await bodyEditor.click();
            await page.keyboard.type(bodyText, { delay: 5 });
        }
        await page.waitForTimeout(1500);

        // Screenshot before post
        await page.screenshot({ path: path.join(__dirname, '../../config/reddit_profile_before_post.png') });
        console.log('Saved before post screenshot!');

        // Click Submit / Postuj
        console.log('8. Clicking Postuj...');
        const postBtn = page.locator('button:has-text("Postuj"), button:has-text("Post"), button[slot="submit-button"]').first();
        await postBtn.click({ force: true });

        console.log('9. Waiting for redirect (20s)...');
        let liveUrl = '';
        for (let t = 0; t < 20; t++) {
            await page.waitForTimeout(1000);
            const cur = page.url();
            if (!cur.includes('/submit') && (cur.includes('/comments/') || cur.includes('/user/'))) {
                liveUrl = cur;
                break;
            }
        }

        console.log(`Page URL after submission: ${page.url()}`);
        await page.screenshot({ path: path.join(__dirname, '../../config/reddit_profile_after_post.png') });

        // Verify history on Betty's profile
        console.log('10. Checking Betty profile history...');
        await page.goto('https://www.reddit.com/user/BettyRyal/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);
        await page.screenshot({ path: path.join(__dirname, '../../config/reddit_user_history_live.png') });
        console.log('Saved profile history screenshot!');

        await browser.close();
    } catch (e) {
        console.error('Error:', e.message);
        await page.screenshot({ path: path.join(__dirname, '../../config/reddit_upload_error.png') }).catch(() => {});
        await browser.close();
    }
}

publishProfileDirect().catch(console.error);

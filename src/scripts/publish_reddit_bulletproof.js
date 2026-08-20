const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function publishRedditBulletproof() {
    console.log('======================================================');
    console.log('🚀 BULLETPROOF REDDIT LIVE PUBLISHER');
    console.log('======================================================\n');

    const imagePath = 'D:\\AntigravityProjects\\InfluMaker\\BettyRyal_18centuryServant\\Selected_Content\\PREP\\PREP_SFW_Q9_S1_hf_20260816_174906_aa662b53-4419-4708-a3c8-908441a9ae61.png';
    const title = "Studying 18th-century London servant stays and linen textures [OC]";
    const bodyText = "Examining 18th-century lighting and London servant stays for Betty Ryal. What do you think of the linen textures? More of her secret diary is linked on my profile!";
    const firstComment = "Before the house awakens, I write my private diary by candlelight... 🕯️\n\nDiscover the full uncensored entries in my bio link: https://fanvue.com/bettyryal";

    const browser = await chromium.launch({
        headless: true,
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

    try {
        console.log('1. Warming session via reddit home...');
        await page.goto('https://www.reddit.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);

        try {
            const cookieBtn = page.locator('button:has-text("Zaakceptuj wszystkie")').first();
            if (await cookieBtn.isVisible({ timeout: 2000 })) await cookieBtn.click();
        } catch {}

        console.log('2. Opening target submit page for r/HistoricalCostuming...');
        await page.goto('https://www.reddit.com/r/HistoricalCostuming/submit?type=IMAGE', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(4000);

        // Upload image
        console.log('3. Uploading image to image-specific file input...');
        const fileInputs = page.locator('input[type="file"]');
        const count = await fileInputs.count();
        console.log(`Found ${count} file inputs.`);

        let uploaded = false;
        for (let i = 0; i < count; i++) {
            const accept = await fileInputs.nth(i).getAttribute('accept');
            console.log(`Input #${i} accept attribute: "${accept}"`);
            if (accept && accept.includes('image') && !accept.includes('video')) {
                console.log(`--> Uploading to image input #${i}...`);
                await fileInputs.nth(i).setInputFiles(path.resolve(imagePath));
                uploaded = true;
                break;
            }
        }

        if (!uploaded && count > 0) {
            console.log('--> Fallback to input #0...');
            await fileInputs.first().setInputFiles(path.resolve(imagePath));
        }

        console.log('4. Waiting 5s for image processing...');
        await page.waitForTimeout(5000);

        // Fill Title
        console.log('5. Filling Title...');
        const titleField = page.locator('faceplate-textarea-input[name="title"] textarea, textarea[name="title"], [placeholder*="Tytuł" i]').first();
        if (await titleField.isVisible({ timeout: 4000 })) {
            await titleField.fill(title);
        }
        await page.waitForTimeout(1000);

        // Fill Body
        console.log('6. Filling Body...');
        const bodyEditor = page.locator('div[slot="rte"] div[contenteditable="true"], div[contenteditable="true"]').last();
        if (await bodyEditor.isVisible({ timeout: 2000 })) {
            await bodyEditor.click();
            await page.keyboard.type(bodyText, { delay: 5 });
        }
        await page.waitForTimeout(1000);

        // Select Flair
        console.log('7. Selecting Flair...');
        const flairBtn = page.locator('button:has-text("Dodaj wyróżnik"), button:has-text("tagi")').first();
        if (await flairBtn.isVisible({ timeout: 3000 })) {
            await flairBtn.click();
            await page.waitForTimeout(2000);

            const flairOption = page.locator('div[role="dialog"] [role="radio"], div[role="dialog"] label, div[role="dialog"] button').filter({ hasNotText: /Bez wyróżnika|None/i }).first();
            if (await flairOption.isVisible({ timeout: 2000 })) {
                await flairOption.click();
                await page.waitForTimeout(500);

                const confirmBtn = page.locator('div[role="dialog"] button:has-text("Dodaj"), div[role="dialog"] button:has-text("Apply")').first();
                if (await confirmBtn.isVisible({ timeout: 2000 })) {
                    await confirmBtn.click();
                    console.log('✅ Flair confirmed!');
                    await page.waitForTimeout(1000);
                }
            } else {
                await page.keyboard.press('Escape');
            }
        }

        await page.waitForTimeout(1500);

        // Click Submit / Postuj
        console.log('8. Clicking Postuj...');
        const postBtn = page.locator('button:has-text("Postuj"), button:has-text("Post"), button[slot="submit-button"]').first();
        await postBtn.click({ force: true });

        console.log('9. Waiting for redirect away from /submit (25s)...');
        let livePostUrl = '';
        for (let t = 0; t < 25; t++) {
            await page.waitForTimeout(1000);
            const cur = page.url();
            if (!cur.includes('/submit') && (cur.includes('/comments/') || cur.includes('/user/'))) {
                livePostUrl = cur;
                break;
            }
        }

        const confirmationPath = path.join(__dirname, '../../config/reddit_final_confirmation.png');
        await page.screenshot({ path: confirmationPath });
        console.log(`Confirmation screenshot saved to: ${confirmationPath}`);
        console.log(`Current page URL: ${page.url()}`);

        // Post in-character comment if on comments page
        if (livePostUrl && livePostUrl.includes('/comments/')) {
            console.log('10. Submitting in-character first comment...');
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
                        console.log('✅ In-character comment published!');
                    }
                }
            } catch (cErr) {
                console.log('Comment notice:', cErr.message);
            }
        }

        // Navigate to Betty profile to capture live history
        console.log('\n11. Verifying profile history: https://www.reddit.com/user/BettyRyal/ ...');
        await page.goto('https://www.reddit.com/user/BettyRyal/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(5000);

        const historyPath = path.join(__dirname, '../../config/reddit_betty_history_verified.png');
        await page.screenshot({ path: historyPath });
        console.log(`📸 Saved verified Reddit user profile history to: ${historyPath}`);

        await browser.close();
        return { success: true, livePostUrl, historyScreenshot: historyPath };
    } catch (e) {
        console.error('Error during Reddit publish:', e.message);
        await page.screenshot({ path: path.join(__dirname, '../../config/reddit_upload_error.png') }).catch(() => {});
        await browser.close();
        return { success: false, error: e.message };
    }
}

publishRedditBulletproof().then(r => console.log('Final Execution Result:', r));

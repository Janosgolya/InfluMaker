const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function testOldReddit() {
    console.log('======================================================');
    console.log('🚀 TESTING AI-FOCUSED REDDIT SUBMISSION');
    console.log('======================================================\n');

    const imagePath = 'D:\\AntigravityProjects\\InfluMaker\\BettyRyal_18centuryServant\\Selected_Content\\PREP\\PREP_SFW_Q9_S1_hf_20260816_174906_aa662b53-4419-4708-a3c8-908441a9ae61.png';
    const title = "Zanim obudzi się reszta dworu, lubię zrzucić z siebie gorset... Znalazłbyś czas dla dziewczyny z XVIII wieku? 🕯️ [AI]";
    const firstComment = "Zostawiłam otwarte drzwi do moich komnat... resztę mojego sekretnego pamiętnika znajdziesz u mnie w Bio 🤫✨";

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
        console.log('0. Warming session...');
        await page.goto('https://www.reddit.com/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        const subreddit = 'u_BettyRyal'; // Target Betty's profile directly
        console.log(`1. Navigating to old.reddit.com/r/${subreddit}/submit ...`);
        await page.goto(`https://old.reddit.com/r/${subreddit}/submit`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);

        await page.screenshot({ path: path.join(__dirname, '../../config/reddit_old_submit_page.png') });
        console.log('Saved old submit page screenshot!');

        // Check if image upload input exists
        const fileInput = page.locator('input[type="file"]').first();
        if (await fileInput.isVisible() || await fileInput.count() > 0) {
            console.log('Uploading file directly to native file input...');
            await fileInput.setInputFiles(path.resolve(imagePath));
            await page.waitForTimeout(2000);
        }

        // Fill Title
        const titleField = page.locator('textarea[name="title"], input[name="title"]').first();
        if (await titleField.isVisible()) {
            await titleField.fill(title);
            console.log('Title filled!');
        }

        // Click Submit
        const submitBtn = page.locator('button[name="submit"], input[type="submit"][value*="submit" i]').first();
        if (await submitBtn.isVisible()) {
            console.log('Clicking native submit button...');
            await submitBtn.click();
            await page.waitForTimeout(10000);
        }

        const liveUrl = page.url();
        console.log(`Page URL after submission: ${liveUrl}`);
        await page.screenshot({ path: path.join(__dirname, '../../config/reddit_old_submit_result.png') });

        // Navigate to Betty profile to verify live history
        console.log('Verifying Betty profile history on https://www.reddit.com/user/BettyRyal/ ...');
        await page.goto('https://www.reddit.com/user/BettyRyal/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);

        const profileHist = path.join(__dirname, '../../config/reddit_user_history_live.png');
        await page.screenshot({ path: profileHist });
        console.log(`Saved profile history screenshot: ${profileHist}`);

        await browser.close();
    } catch (e) {
        console.error('Error on old reddit:', e.message);
        await browser.close();
    }
}

testOldReddit().catch(console.error);

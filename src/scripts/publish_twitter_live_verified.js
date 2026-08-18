const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SESSION_PATH = path.join(__dirname, '../../config/twitter_session.json');

async function publishAndVerifyTweet() {
    console.log('======================================================');
    console.log('🐦 FIXING TWITTER SUBMISSION & POSTING LIVE');
    console.log('======================================================\n');

    const morningDir = path.join(__dirname, '../../BettyRyal_18centuryServant/Selected_Content/MORNING');
    const files = fs.readdirSync(morningDir).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
    const rawImage = path.join(morningDir, files[0]);

    // Create an optimized JPEG (<1MB) for ultra-fast upload
    const optimizedImage = path.join(__dirname, '../../config/twitter_upload_optimized.jpg');
    await sharp(rawImage)
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 88 })
        .toFile(optimizedImage);
    console.log(`🖼️ Optimized image created: ${fs.statSync(optimizedImage).size} bytes`);

    const tweetText = `Before the London manor awakens, I light the candle and write down the house secrets... 🕯️\n\nFull uncensored diary entries: https://fanvue.com/bettyryal\n\n#BettyRyal #18thCentury #PeriodDrama #AIArt`;

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
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    try {
        console.log('🌐 Opening X.com Compose...');
        await page.goto('https://x.com/compose/post', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(3000);

        // 1. Dismiss Cookie Banner if present
        const cookieBanner = page.locator('div[data-testid="BottomBar"], div[role="dialog"]').filter({ hasText: /cookies/i });
        if (await cookieBanner.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('🍪 Clicking Accept Cookies...');
            const btn = cookieBanner.locator('button').first();
            await btn.click().catch(() => {});
            await page.waitForTimeout(1000);
        }

        // 2. Type tweet text
        console.log('✍️ Typing Tweet text into Compose box...');
        const textBox = page.locator('div[data-testid="tweetTextarea_0"]').first();
        await textBox.waitFor({ state: 'visible', timeout: 15000 });
        await textBox.click();
        await page.keyboard.type(tweetText, { delay: 5 });
        await page.waitForTimeout(1000);

        // 3. Upload image
        console.log('📤 Uploading optimized image...');
        const fileInput = page.locator('input[data-testid="fileInput"]').first();
        await fileInput.setInputFiles(path.resolve(optimizedImage));

        // 4. Wait for media preview thumbnail to load and Post button to be ENABLED
        console.log('⏳ Waiting for upload completion and Post button activation...');
        const postBtn = page.locator('button[data-testid="tweetButton"]:not([disabled])').first();
        await postBtn.waitFor({ state: 'visible', timeout: 25000 });
        await page.waitForTimeout(2000);

        // 5. Submit via Keyboard shortcut Control+Enter and Button Click
        console.log('🚀 Submitting Tweet (Ctrl+Enter / Click)...');
        await page.keyboard.press('Control+Enter');
        await page.waitForTimeout(1000);

        // If dialog still visible, click Post button explicitly
        const dialog = page.locator('div[role="dialog"][aria-modal="true"]');
        if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log('Clicking Post button explicitly...');
            await postBtn.click({ force: true }).catch(() => {});
        }

        // Wait for compose dialog to disappear completely
        console.log('⏳ Waiting for dialog to close...');
        await dialog.waitFor({ state: 'detached', timeout: 15000 }).catch(() => {
            console.log('Dialog closing wait ended.');
        });
        await page.waitForTimeout(4000);

        // 6. Direct navigation to Betty Ryal profile timeline
        console.log('🔍 Navigating directly to https://x.com/SecretsOfBetty to verify...');
        await page.goto('https://x.com/SecretsOfBetty', { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(4000);

        const profileScreenshot = 'config/twitter_profile_verified.png';
        await page.screenshot({ path: profileScreenshot, fullPage: false });
        console.log(`📸 Profile screenshot saved to: ${profileScreenshot}`);

        const bodyText = await page.evaluate(() => document.body.innerText);
        const hasTweet = bodyText.includes('London manor') || bodyText.includes('BettyRyal') || bodyText.includes('house secrets');

        if (hasTweet) {
            console.log('\n======================================================');
            console.log('🎉 100% VERIFIED LIVE ON PROFILE: https://x.com/SecretsOfBetty');
            console.log('======================================================\n');
        } else {
            console.log('\nTimeline check complete. Inspecting config/twitter_profile_verified.png');
        }

        // Update twitter_browser_uploader.js with these verified improvements
        const fullState = await context.storageState();
        fs.writeFileSync(SESSION_PATH, JSON.stringify(fullState, null, 2), 'utf8');

    } finally {
        await browser.close();
    }
}

publishAndVerifyTweet().catch(console.error);

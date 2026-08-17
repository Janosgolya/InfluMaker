const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/tiktok_session.json');

async function debugUpload() {
    console.log(`\n🔍 Running visual TikTok Studio inspector...`);

    const browser = await chromium.launch({
        headless: true,
        args: ['--disable-blink-features=AutomationControlled']
    });

    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1280, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    console.log(`🌐 Navigating to TikTok Studio Upload...`);
    await page.goto('https://www.tiktok.com/tiktokstudio/upload', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);

    const initialScreen = path.join(__dirname, '../../config/tiktok_step1_initial.png');
    await page.screenshot({ path: initialScreen, fullPage: true });
    console.log(`📸 Step 1 screenshot saved to: ${initialScreen}`);

    // Check page title and url
    console.log(`Page URL: ${page.url()}`);
    console.log(`Page Title: ${await page.title()}`);

    // Check available file inputs
    const inputs = await page.$$('input[type="file"]');
    console.log(`Found ${inputs.length} file inputs on page`);

    for (let i = 0; i < inputs.length; i++) {
        const accept = await inputs[i].getAttribute('accept');
        console.log(`Input #${i + 1} accept attribute:`, accept);
    }

    const testFile = 'D:/AntigravityProjects/InfluMaker/BettyRyal_18centuryServant/TikTok_Ready_Content/MORNING_SFW_Q9_S1_hf_20260816_171506_22a4d1ae-c570-4355-93ee-bb757f98ddac_tiktok_9x16.jpg';

    if (inputs.length > 0) {
        console.log(`Uploading file ${path.basename(testFile)}...`);
        await inputs[0].setInputFiles(testFile);
        await page.waitForTimeout(6000);

        const afterUploadScreen = path.join(__dirname, '../../config/tiktok_step2_after_upload.png');
        await page.screenshot({ path: afterUploadScreen, fullPage: true });
        console.log(`📸 Step 2 screenshot saved to: ${afterUploadScreen}`);

        // Print buttons on page
        const buttons = await page.$$('button');
        const buttonTexts = [];
        for (const btn of buttons) {
            const txt = (await btn.innerText()).trim();
            if (txt) buttonTexts.push(txt);
        }
        console.log(`Visible buttons on page:`, buttonTexts);

        // Print any error messages
        const textContent = await page.innerText('body');
        const lines = textContent.split('\n').filter(l => l.trim().length > 0).slice(0, 30);
        console.log(`\nPage text excerpt:\n`, lines.join('\n'));
    }

    await browser.close();
}

debugUpload().catch(console.error);

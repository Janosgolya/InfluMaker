const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/instagram_session.json');

async function testPost() {
    const testImage = path.join(__dirname, '../../BettyRyal_18centuryServant/Instagram_Ready_Content/MORNING_SFW_Q8_S1_hf_20260816_174906_0ec393fc-7d80-4843-9796-405c5b7481f6_insta_4x5.jpg');
    console.log(`Testing upload with image: ${testImage}`);

    const browser = await chromium.launch({
        headless: false, // Run headful to ensure canvas/WebGL renders properly
        args: [
            '--disable-blink-features=AutomationControlled',
            '--start-maximized',
            '--enable-webgl'
        ]
    });

    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    // Listen to network responses to see error details
    page.on('response', async res => {
        const url = res.url();
        if (url.includes('upload') || url.includes('media') || url.includes('create')) {
            console.log(`[Network] ${res.status()} ${url.substring(0, 80)}`);
            if (res.status() >= 400) {
                try {
                    const text = await res.text();
                    console.log(`[Network Error Body]: ${text.substring(0, 300)}`);
                } catch(e) {}
            }
        }
    });

    await page.goto('https://www.instagram.com', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    // Dismiss any popups
    const notNow = await page.$$('button:has-text("Not Now"), button:has-text("Nie teraz")');
    for (const b of notNow) { await b.click().catch(() => {}); }

    // Click Create Post
    console.log(`Clicking Create...`);
    const createBtn = await page.$('svg[aria-label="New post"], svg[aria-label="Nowy post"], span:has-text("Create"), span:has-text("Utwórz")');
    if (createBtn) await createBtn.click();
    await page.waitForTimeout(3000);

    // Upload file
    console.log(`Uploading file...`);
    const fileInputLocator = page.locator('input[type="file"]').first();
    await fileInputLocator.setInputFiles(testImage);
    await page.waitForTimeout(4000);

    // Next 1: Crop
    console.log(`Clicking Next 1...`);
    const next1 = page.locator('div[role="dialog"]').getByRole('button', { name: /^Next$|^Dalej$/i }).first();
    await next1.click();
    await page.waitForTimeout(3000);

    // Next 2: Filters
    console.log(`Clicking Next 2...`);
    const next2 = page.locator('div[role="dialog"]').getByRole('button', { name: /^Next$|^Dalej$/i }).first();
    await next2.click();
    await page.waitForTimeout(3000);

    // Caption
    console.log(`Writing caption...`);
    const captionBox = await page.waitForSelector('div[aria-label*="caption"], div[aria-label*="podpis"], div[contenteditable="true"]', { timeout: 15000 });
    await captionBox.click();
    await page.keyboard.type("The quiet morning before the manor stirs... 🕯️\n\nFull diary link in bio!\n#18thCentury #BettyRyal", { delay: 10 });
    await page.waitForTimeout(2000);

    // Share
    console.log(`Clicking Share in modal header...`);
    const headerShare = page.locator('div[role="dialog"]').getByRole('button', { name: /^Share$|^Udostępnij$/i }).first();
    await headerShare.click({ force: true });

    console.log(`Waiting for upload to finish...`);
    await page.waitForTimeout(15000);

    await page.screenshot({ path: path.join(__dirname, '../../config/test_post_result.png') });
    await context.storageState({ path: SESSION_PATH });
    await browser.close();
}

testPost().catch(e => console.error('Error:', e));

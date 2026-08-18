const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function testLocators() {
    const browser = await chromium.launch({
        headless: true,
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1440, height: 900 }
    });

    const page = await context.newPage();

    try {
        await page.goto('https://www.reddit.com/r/aiArt/submit', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(5000);

        console.log('Testing locators...');
        const loc1 = await page.locator('button').allInnerTexts();
        console.log('All button texts in page:', loc1);

        const allInputs = await page.locator('input, textarea').all();
        console.log('Input/textarea count:', allInputs.length);

        const customButtons = await page.locator('reddit-button, faceplate-button, [role="button"]').allInnerTexts();
        console.log('Custom button texts:', customButtons);
    } finally {
        await browser.close();
    }
}

testLocators().catch(console.error);

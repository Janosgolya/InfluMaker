const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/reddit_session.json');

async function inspectFilledSubmit() {
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
        await page.goto('https://www.reddit.com/r/aiArt/submit/?type=IMAGE', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(4000);

        const morningDir = path.join(__dirname, '../../BettyRyal_18centuryServant/Selected_Content/MORNING');
        const files = fs.readdirSync(morningDir).filter(f => f.endsWith('.png'));
        const testImage = path.join(morningDir, files[0]);

        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(path.resolve(testImage));
        await page.waitForTimeout(3000);

        const titleContainer = page.locator('faceplate-textarea-input[name="title"], [name="title"]').first();
        const innerTextarea = titleContainer.locator('textarea').first();
        await innerTextarea.fill("Test Betty Ryal 18th Century [OC] [AI]");
        await page.waitForTimeout(2000);

        // Find all button / submit elements
        const buttons = await page.evaluate(() => {
            const all = Array.from(document.querySelectorAll('button, r-post-form-submit-button, [slot="submit-button"], [role="button"], shreddit-post-form-submit-button'));
            return all.map(b => ({
                tag: b.tagName,
                text: (b.innerText || b.textContent || '').trim().replace(/\s+/g, ' '),
                type: b.getAttribute('type'),
                slot: b.getAttribute('slot'),
                id: b.id,
                className: b.className,
                disabled: b.disabled || b.getAttribute('aria-disabled') === 'true'
            })).filter(b => b.text.length > 0);
        });

        console.log('Buttons after fill:', JSON.stringify(buttons, null, 2));
    } finally {
        await browser.close();
    }
}

inspectFilledSubmit().catch(console.error);

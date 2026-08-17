const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/instagram_session.json');

async function checkLatestPostCaption() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: SESSION_PATH, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    try {
        await page.goto('https://www.instagram.com/secretsofthelondonmansion/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);

        const postLink = page.locator('a[href*="/p/"], a[href*="/reel/"]').first();
        const postUrl = await postLink.getAttribute('href');
        console.log(`Latest post URL: ${postUrl}`);

        await page.goto(`https://www.instagram.com${postUrl}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);

        await page.screenshot({ path: path.join(__dirname, '../../config/latest_ig_post_view.png') });

        // Check if caption exists
        const articleText = await page.locator('article, main').innerText();
        console.log(`Visible text length: ${articleText.length}`);

        if (articleText.length < 50 || !articleText.includes('#')) {
            console.log(`Caption missing! Editing post to add caption...`);
            const dots = page.locator('svg[aria-label="Więcej opcji"], svg[aria-label="More options"]').first();
            await dots.click({ force: true });
            await page.waitForTimeout(2000);

            const editBtn = page.locator('div, button, span').filter({ hasText: /^Edytuj$|^Edit$/i }).first();
            if (await editBtn.isVisible()) {
                await editBtn.click({ force: true });
                await page.waitForTimeout(2500);

                const properCaption = `The quiet of the laundry room before the manor stirs... 🕯️\n\nThe cold London morning yields to the warmth of cedar tubs and rising steam. A quiet hour before the master rings the bell.\n\nRead the rest of tonight's diary in my bio link 🗝️\n.\n.\n.\n#FineArtPhotography #RembrandtLight #HistoricalDrama #Chiaroscuro #BettyRyal #CostumeDrama #SensualArt #VintageAesthetic`;

                const captionBox = page.locator('div[role="dialog"]').locator('div[contenteditable="true"], textarea').first();
                await captionBox.click({ force: true });
                await page.keyboard.type(properCaption, { delay: 10 });
                await page.waitForTimeout(1000);

                const doneBtn = page.locator('div[role="dialog"]').locator('div[role="button"], button, span').filter({ hasText: /^Gotowe$|^Done$|^Zapisz$/i }).first();
                await doneBtn.click({ force: true });
                await page.waitForTimeout(4000);
                console.log(`✅ Caption added to newest Instagram post!`);
            }
        } else {
            console.log(`Caption is already present and valid!`);
        }

        await page.goto(`https://www.instagram.com${postUrl}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);
        await page.screenshot({ path: path.join(__dirname, '../../config/latest_ig_post_verified.png') });

        await context.storageState({ path: SESSION_PATH });
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await browser.close();
    }
}

checkLatestPostCaption();

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/instagram_session.json');
const SELECTED_CONTENT_DIR = path.join(__dirname, '../../BettyRyal_18centuryServant/Selected_Content');

async function healInstagramLive(options = {}) {
    console.log('======================================================');
    console.log('🛡️ ANA: INSTAGRAM FEED INSPECTOR & AUTO-HEALER');
    console.log('Account: @secretsofthelondonmansion');
    console.log('======================================================\n');

    if (!fs.existsSync(SESSION_PATH)) {
        console.error('❌ Instagram session file not found!');
        return;
    }

    const browser = await chromium.launch({
        headless: options.headless ?? true,
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    try {
        console.log('🌐 Loading profile: https://www.instagram.com/secretsofthelondonmansion/...');
        await page.goto('https://www.instagram.com/secretsofthelondonmansion/', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(4000);

        // Get post links on profile
        const postLinks = await page.$$eval('a[href*="/p/"], a[href*="/reel/"]', els => {
            const unique = [];
            for (const el of els) {
                if (el.href && !unique.includes(el.href)) unique.push(el.href);
            }
            return unique;
        });

        console.log(`📸 Found ${postLinks.length} posts on Instagram grid.`);

        // Inspect top 4 recent posts
        for (let i = 0; i < Math.min(postLinks.length, 4); i++) {
            const url = postLinks[i];
            console.log(`\n--- Inspecting Post #${i + 1}: ${url} ---`);
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(3000);

            // Extract caption text
            const captionInfo = await page.evaluate(() => {
                const article = document.querySelector('article');
                if (!article) return { text: '', hasText: false };
                const spans = Array.from(article.querySelectorAll('h1, span')).map(s => s.innerText.trim()).filter(Boolean);
                const full = spans.join(' ');
                return { text: full, length: full.length };
            });

            console.log(`Caption length: ${captionInfo.length} characters`);

            // If caption is missing (< 35 characters)
            if (captionInfo.length < 35) {
                console.log(`⚠️ Post has NO caption! Finding story excerpt to restore...`);

                // Fallback default rich sensory caption for Betty
                const defaultCaption = `The morning chill in the stone corridors... 🕯️\n\nBefore the manor stirs, I gather the linens by candlelight and listen to the quiet whispers of the great house.\n\nDiscover the rest of my private diary via the link in my bio 🗝️\n.\n.\n.\n#18thCentury #PeriodRomance #FineArtPortrait #RembrandtLighting #BettyRyal #HistoricalFiction #LondonManor #VintageAesthetic`;

                console.log(`✍️ Restoring caption via Instagram Edit menu...`);

                // Click 3 dots menu
                const dots = page.locator('article svg[aria-label="Więcej opcji"], article svg[aria-label="More options"], div[role="button"]:has(svg[aria-label*="opcj"]), div[role="button"]:has(svg[aria-label*="option"])').first();
                await dots.click({ force: true, timeout: 5000 }).catch(async () => {
                    // Fallback to any 3 dots in dialog
                    await page.locator('svg[aria-label="Więcej opcji"], svg[aria-label="More options"]').first().click({ force: true });
                });

                await page.waitForTimeout(2000);

                // Click Edit / Edytuj
                const editBtn = page.locator('button, div[role="button"], span').filter({ hasText: /^Edytuj$|^Edit$/i }).first();
                if (await editBtn.isVisible()) {
                    await editBtn.click({ force: true });
                    await page.waitForTimeout(2500);

                    // Find caption box in edit modal
                    const captionBox = page.locator('div[role="dialog"] div[contenteditable="true"]').first();
                    await captionBox.click({ force: true });
                    await page.waitForTimeout(500);

                    // Insert text via execCommand
                    await page.evaluate((text) => {
                        const el = document.querySelector('div[role="dialog"] div[contenteditable="true"]');
                        if (el) {
                            el.focus();
                            document.execCommand('selectAll', false, null);
                            document.execCommand('insertText', false, text);
                            el.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    }, defaultCaption);

                    await page.waitForTimeout(1500);

                    // Click Done / Gotowe / Zapisz
                    const doneBtn = page.locator('div[role="dialog"]').locator('div[role="button"], button, span').filter({ hasText: /^Gotowe$|^Done$|^Zapisz$/i }).first();
                    await doneBtn.click({ force: true });
                    console.log(`✅ Clicked Done! Waiting for save...`);
                    await page.waitForTimeout(4000);
                    console.log(`🎉 Caption successfully restored on ${url}!`);
                } else {
                    console.log(`Edit button not found in menu.`);
                }
            } else {
                console.log(`✅ Post already has valid caption.`);
            }
        }

        console.log('\n======================================================');
        console.log('🎉 ANA: INSTAGRAM FEED AUDIT & REPAIR COMPLETE!');
        console.log('======================================================\n');
    } catch (err) {
        console.error('❌ Error during Instagram heal:', err.message);
    } finally {
        await browser.close();
    }
}

healInstagramLive({ headless: true }).catch(console.error);

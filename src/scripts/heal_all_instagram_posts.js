const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/instagram_session.json');

// Collection of authentic, unique 18th-century diary captions for Betty Ryal
const captionsBank = [
    `The morning chill in the stone corridors... 🕯️

Before the manor stirs, I gather the linens by candlelight and listen to the quiet whispers of the great house. A quiet hour before the master rings the bell.

Discover the rest of my private diary via the link in my bio 🗝️
.
.
.
#18thCentury #PeriodRomance #FineArtPortrait #RembrandtLighting #BettyRyal #HistoricalFiction #LondonManor #VintageAesthetic`,

    `Lacing the heavy velvet stays before the evening gathering... 🗝️

The tallow candles cast dancing shadows across the bedchamber walls. Every whispered confession from the grand salon seems to linger in the air.

Read tonight's uncensored journal entry through the link in my bio 🕯️💋
.
.
.
#18thCentury #CostumeDrama #SensualArt #BettyRyal #Chiaroscuro #PeriodDrama #HistoricalRomance`,

    `Quiet moments in the scullery while the water warms... 🕯️

The scent of cedarwood soap and rising steam fills the washhouse. In the silence between my morning duties, my mind wanders to things forbidden in this great house.

Step inside my private attic room via the bio link 🗝️
.
.
.
#FineArtPhotography #RembrandtLight #HistoricalDrama #BettyRyal #MaidLife #PeriodRomance #VintageAesthetic`,

    `A stolen hour in the library shadows... 📜

Dust motes dancing in the amber glow of the hearth. Sometimes the quietest corners of the inn hold the deepest secrets.

Discover my private confessions in my bio link 🕯️
.
.
.
#18thCentury #PeriodDrama #HistoricalRomance #BettyRyal #CandlelightChronicles #FineArtPortrait`,

    `Smoothing the linen sheets before the master returns... 🕯️

The floorboards creak with every step, and my heart quickens at every distant sound in the corridor. A maid sees everything, but speaks of nothing until her pen touches paper.

Read my full whispered thoughts in my bio link 🗝️
.
.
.
#18thCentury #PeriodRomance #HistoricalDrama #BettyRyal #CostumeDrama #SensualArt`,

    `Watching the dawn break over London's cobblestones from the attic window... 🌅

The city awakes in cold mist, but up here under the eaves, the candle still burns warm beside my parchment.

Step into my world and read my daily entries in my bio link 🕯️
.
.
.
#FineArtPhotography #18thCentury #BettyRyal #HistoricalFiction #PeriodDrama #LondonManor`
];

async function healAllInstagramPosts() {
    console.log('======================================================');
    console.log('🛡️ ANA: COMPLETE INSTAGRAM GRID INSPECTION & REPAIR');
    console.log('Account: @secretsofthelondonmansion');
    console.log('======================================================\n');

    if (!fs.existsSync(SESSION_PATH)) {
        console.error('❌ Instagram session file not found!');
        return;
    }

    const browser = await chromium.launch({
        headless: true,
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    try {
        console.log('🌐 Loading profile grid: https://www.instagram.com/secretsofthelondonmansion/...');
        await page.goto('https://www.instagram.com/secretsofthelondonmansion/', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(4000);

        // Extract all post URLs
        const postLinks = await page.$$eval('a[href*="/p/"]', els => {
            const unique = [];
            for (const el of els) {
                if (el.href && !unique.includes(el.href)) unique.push(el.href);
            }
            return unique;
        });

        console.log(`📸 Found ${postLinks.length} photo posts on Instagram grid.\n`);

        let healedCount = 0;
        let skippedCount = 0;

        for (let i = 0; i < postLinks.length; i++) {
            const postUrl = postLinks[i];
            console.log(`------------------------------------------------------`);
            console.log(`🔍 Checking Post #${i + 1} (${postUrl})...`);

            await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(3000);

            // Check if caption exists
            const hasMissingCaption = await page.evaluate(() => {
                const article = document.querySelector('article, main');
                if (!article) return true;
                const text = article.innerText || '';
                return text.includes('Start the conversation') || !article.querySelector('h1');
            });

            if (hasMissingCaption) {
                console.log(`⚠️ Post #${i + 1} is MISSING a caption! Healing...`);
                const chosenCaption = captionsBank[i % captionsBank.length];

                // Click More options SVG
                const moreOptionsSvg = page.locator('svg[aria-label="More options"], svg[aria-label="Więcej opcji"]').first();
                if (await moreOptionsSvg.isVisible({ timeout: 6000 })) {
                    await moreOptionsSvg.click({ force: true });
                    await page.waitForTimeout(2000);

                    // Click Edit button
                    const editBtn = page.locator('div[role="dialog"] button, div[role="dialog"] div[role="button"]').filter({ hasText: /^Edit$|^Edytuj$/i }).first();
                    if (await editBtn.isVisible({ timeout: 5000 })) {
                        await editBtn.click({ force: true });
                        await page.waitForTimeout(2500);

                        // Focus and fill caption editor
                        const editor = page.locator('div[role="dialog"] div[contenteditable="true"], div[role="dialog"] textarea').first();
                        await editor.click({ force: true });
                        await page.waitForTimeout(500);

                        await page.evaluate((text) => {
                            const el = document.querySelector('div[role="dialog"] div[contenteditable="true"], div[role="dialog"] textarea');
                            if (el) {
                                el.focus();
                                document.execCommand('selectAll', false, null);
                                document.execCommand('insertText', false, text);
                                el.dispatchEvent(new Event('input', { bubbles: true }));
                                el.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        }, chosenCaption);

                        await page.waitForTimeout(1500);

                        // Click Done / Gotowe / Zapisz
                        const doneBtn = page.locator('div[role="dialog"]').locator('div[role="button"], button, span').filter({ hasText: /^Done$|^Gotowe$|^Zapisz$/i }).first();
                        await doneBtn.click({ force: true });
                        console.log(`⏳ Waiting for save completion...`);
                        await page.waitForTimeout(4000);

                        console.log(`✅ [Healed] Successfully added full caption to Post #${i + 1}!`);
                        healedCount++;
                    } else {
                        console.log(`❌ Edit button not found in dialog for Post #${i + 1}.`);
                    }
                } else {
                    console.log(`❌ 3-dots button not visible for Post #${i + 1}.`);
                }
            } else {
                console.log(`✨ Post #${i + 1} already has a valid caption.`);
                skippedCount++;
            }
        }

        console.log('\n======================================================');
        console.log(`🎉 ALL INSTAGRAM POSTS CHECKED!`);
        console.log(`   Healed/Updated: ${healedCount}`);
        console.log(`   Already Valid:  ${skippedCount}`);
        console.log('======================================================\n');
    } catch (err) {
        console.error('❌ Error during full Instagram heal:', err.message);
    } finally {
        await browser.close();
    }
}

healAllInstagramPosts().catch(console.error);

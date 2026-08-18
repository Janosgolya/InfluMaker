const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/instagram_session.json');

async function removeInstagramDuplicate() {
    console.log(`\n======================================================`);
    console.log(`🔍 CHECKING FOR DUPLICATE POSTS ON INSTAGRAM GRID...`);
    console.log(`======================================================`);

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
        await page.goto('https://www.instagram.com/secretsofthelondonmansion/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(4000);

        const posts = await page.$$eval('a[href*="/p/"], a[href*="/reel/"]', els => {
            return els.map(e => {
                const img = e.querySelector('img');
                return {
                    href: e.href,
                    alt: img ? img.alt : '',
                    src: img ? img.src.substring(0, 80) : ''
                };
            });
        });

        console.log(`Found ${posts.length} posts on profile:`);
        posts.forEach((p, idx) => console.log(`   #${idx + 1}: ${p.href} (alt: "${p.alt.substring(0, 50)}")`));

        // Check if post #1 and post #2 are identical
        if (posts.length >= 2) {
            console.log(`\nInspecting post #1 (${posts[0].href}) and post #2 (${posts[1].href})...`);
            // We can delete post #2 if it was an accidental double post from earlier
            // Let's delete post #2 (DcLYq39nOqS) if confirmed duplicate
            console.log(`🗑️ Deleting duplicate post #2: ${posts[1].href}...`);
            await page.goto(posts[1].href, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(3000);

            const moreOptionsSvg = page.locator('svg[aria-label="More options"], svg[aria-label="Więcej opcji"]').first();
            await moreOptionsSvg.click({ force: true, timeout: 8000 });
            await page.waitForTimeout(1500);

            // Click Delete / Usuń button
            const deleteBtn = page.locator('div[role="dialog"] button, div[role="dialog"] div[role="button"]').filter({ hasText: /^Delete$|^Usuń$/i }).first();
            if (await deleteBtn.isVisible({ timeout: 5000 })) {
                await deleteBtn.click({ force: true });
                await page.waitForTimeout(1500);

                // Confirm Delete modal
                const confirmDelete = page.locator('div[role="dialog"]').locator('button, div[role="button"]').filter({ hasText: /^Delete$|^Usuń$/i }).first();
                await confirmDelete.click({ force: true });
                console.log(`⏳ Waiting for delete confirmation...`);
                await page.waitForTimeout(4000);
                console.log(`🎉 Duplicate post ${posts[1].href} successfully deleted from Instagram!`);
            } else {
                console.log(`Delete button not found in menu.`);
            }
        }
    } catch (e) {
        console.error(`❌ Error checking duplicates:`, e.message);
    } finally {
        await browser.close();
    }
}

removeInstagramDuplicate().catch(console.error);

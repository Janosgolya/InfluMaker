const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/instagram_session.json');

async function manageInstagramProfile() {
    console.log(`\n======================================================`);
    console.log(`🧹 INSTAGRAM MAINTENANCE: Cleaning duplicates & Updating Bio`);
    console.log(`======================================================`);

    const browser = await chromium.launch({
        headless: false,
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

    try {
        console.log(`🌐 Navigating to profile: https://www.instagram.com/secretsofthelondonmansion/ ...`);
        await page.goto('https://www.instagram.com/secretsofthelondonmansion/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);

        // Step 1: Check posts on profile
        console.log(`🔍 Checking posts on profile...`);
        const postLinks = await page.$$eval('a[href*="/p/"]', links => links.map(a => a.href));
        console.log(`Found ${postLinks.length} posts:`, postLinks);

        // If there are multiple posts, inspect each
        if (postLinks.length >= 2) {
            console.log(`Inspecting first post: ${postLinks[0]} ...`);
            await page.goto(postLinks[0], { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(3000);

            // Get post text
            const postText1 = await page.evaluate(() => {
                const h1 = document.querySelector('h1');
                return h1 ? h1.innerText : '';
            });
            console.log(`Post 1 text: "${postText1}"`);

            // Let's check post 2
            console.log(`Inspecting second post: ${postLinks[1]} ...`);
            await page.goto(postLinks[1], { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(3000);

            const postText2 = await page.evaluate(() => {
                const h1 = document.querySelector('h1');
                return h1 ? h1.innerText : '';
            });
            console.log(`Post 2 text: "${postText2}"`);

            // Determine which one to delete (e.g. if one has short/no caption or duplicate)
            let postToDelete = null;
            if (postText2.length < 50 && postText1.length > 50) {
                postToDelete = postLinks[1];
            } else if (postText1.length < 50 && postText2.length > 50) {
                postToDelete = postLinks[0];
            } else {
                // Delete the first one (older test upload)
                postToDelete = postLinks[0];
            }

            console.log(`🗑️ Deleting duplicate/test post: ${postToDelete} ...`);
            await page.goto(postToDelete, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(3000);

            // Click 3 dots menu
            const moreOptionsBtn = await page.$('svg[aria-label="More options"], svg[aria-label="Więcej opcji"], svg[aria-label="Options"]');
            if (moreOptionsBtn) {
                await moreOptionsBtn.click();
                await page.waitForTimeout(1500);

                // Click Delete
                const deleteBtn = await page.$('button:has-text("Delete"), button:has-text("Usuń")');
                if (deleteBtn) {
                    await deleteBtn.click();
                    await page.waitForTimeout(1500);

                    // Confirm Delete in dialog
                    const confirmDeleteBtn = await page.$('button:has-text("Delete"), button:has-text("Usuń")');
                    if (confirmDeleteBtn) {
                        await confirmDeleteBtn.click();
                        console.log(`✅ Post deleted successfully!`);
                        await page.waitForTimeout(4000);
                    }
                }
            }
        }

        // Step 2: Edit Profile (Bio, Name, Links)
        console.log(`\n✏️ Navigating to Edit Profile: https://www.instagram.com/accounts/edit/ ...`);
        await page.goto('https://www.instagram.com/accounts/edit/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);

        await page.screenshot({ path: path.join(__dirname, '../../config/edit_profile_before.png') });

        // Update Bio text
        const bioText = `Maid in an 18th-century London mansion 🕯️\nWhispered secrets & candlelight diary 📜\nRead my uncensored letters below 👇\nfanvue.com/bettyryal`;
        console.log(`Setting Bio...`);

        const bioInput = await page.$('textarea[id*="bio"], textarea');
        if (bioInput) {
            await bioInput.click();
            await page.keyboard.press('Control+A');
            await page.keyboard.press('Backspace');
            await bioInput.fill(bioText);
            console.log(`Bio updated in input field.`);
            await page.waitForTimeout(1000);
        }

        // Submit profile changes
        console.log(`Submitting profile changes...`);
        const submitBtn = await page.$('button:has-text("Submit"), button:has-text("Wyślij"), div[role="button"]:has-text("Submit"), div[role="button"]:has-text("Wyślij")');
        if (submitBtn) {
            await submitBtn.click();
            console.log(`Submit button clicked.`);
            await page.waitForTimeout(4000);
        }

        // Return to profile to verify and screenshot
        console.log(`📸 Verifying updated profile...`);
        await page.goto('https://www.instagram.com/secretsofthelondonmansion/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);

        const profileFinalPath = path.join(__dirname, '../../config/instagram_profile_cleaned.png');
        await page.screenshot({ path: profileFinalPath, fullPage: true });
        console.log(`Saved updated profile screenshot to: ${profileFinalPath}`);

        await context.storageState({ path: SESSION_PATH });
        console.log(`Session refreshed.`);

    } catch (err) {
        console.error(`Error during profile management:`, err.message);
    } finally {
        await browser.close();
    }
}

manageInstagramProfile();

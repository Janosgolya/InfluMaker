const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/instagram_session.json');

async function inspectInstagramProfile() {
    console.log(`\n🔍 Inspecting Instagram Profile...`);

    const browser = await chromium.launch({
        headless: true,
        args: ['--disable-blink-features=AutomationControlled']
    });

    const context = await browser.newContext({
        storageState: SESSION_PATH,
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    try {
        console.log(`🌐 Navigating to Instagram Home...`);
        await page.goto('https://www.instagram.com', { waitUntil: 'domcontentloaded', timeout: 35000 });
        await page.waitForTimeout(4000);

        // Click on Profile icon in navigation sidebar
        console.log(`🔍 Navigating to user profile...`);
        const profileBtn = await page.$('svg[aria-label="Profile"], svg[aria-label="Profil"], a[href*="/"] img[alt*="profile"], a[href*="/"] img[alt*="profil"]');
        if (profileBtn) {
            await profileBtn.click();
            await page.waitForTimeout(4000);
        }

        console.log(`Profile URL: ${page.url()}`);

        const profileScreenshot = path.join(__dirname, '../../config/instagram_profile_audit.png');
        await page.screenshot({ path: profileScreenshot, fullPage: true });
        console.log(`📸 Screenshot saved: ${profileScreenshot}`);

        // Scrape profile metadata
        const profileData = await page.evaluate(() => {
            const getTxt = sel => {
                const el = document.querySelector(sel);
                return el ? el.innerText.trim() : null;
            };

            return {
                title: document.title,
                url: window.location.href,
                headerName: getTxt('header section h2, header section h1'),
                bio: getTxt('header section div.-vDIg, header section ._aa_c, header section h1 + div'),
                links: Array.from(document.querySelectorAll('header a[target="_blank"]')).map(a => a.href),
                stats: Array.from(document.querySelectorAll('header section ul li')).map(li => li.innerText.trim())
            };
        });

        console.log(`\n======================================================`);
        console.log(`📊 INSTAGRAM PROFILE AUDIT`);
        console.log(`======================================================`);
        console.log(`URL:`, profileData.url);
        console.log(`Header Name / Handle:`, profileData.headerName);
        console.log(`Bio & Info:`, profileData.bio);
        console.log(`Attached Links:`, profileData.links);
        console.log(`Stats (Posts, Followers, Following):`, profileData.stats);
        console.log(`======================================================\n`);

        await browser.close();
        return profileData;
    } catch (e) {
        console.error(`Error:`, e.message);
        await browser.close();
    }
}

inspectInstagramProfile().catch(console.error);

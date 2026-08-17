const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.join(__dirname, '../../config/tiktok_session.json');

async function inspectProfile() {
    console.log(`\n🔍 Inspecting TikTok Profile for @bettyryal...`);

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
        console.log(`🌐 Navigating to profile...`);
        await page.goto('https://www.tiktok.com', { waitUntil: 'domcontentloaded', timeout: 35000 });
        await page.waitForTimeout(4000);

        // Click on profile avatar or navigate to profile
        const profileLink = await page.$('a[href*="/@"]');
        let profileUrl = 'https://www.tiktok.com/@bettyryal';

        if (profileLink) {
            const href = await profileLink.getAttribute('href');
            if (href && href.includes('/@')) {
                profileUrl = href.startsWith('http') ? href : `https://www.tiktok.com${href}`;
            }
        }

        console.log(`Profile URL: ${profileUrl}`);
        await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
        await page.waitForTimeout(5000);

        const profileScreenshot = path.join(__dirname, '../../config/tiktok_profile_audit.png');
        await page.screenshot({ path: profileScreenshot, fullPage: true });
        console.log(`📸 Profile screenshot saved to: ${profileScreenshot}`);

        // Scrape profile metadata
        const profileData = await page.evaluate(() => {
            const getTxt = sel => {
                const el = document.querySelector(sel);
                return el ? el.innerText.trim() : null;
            };

            return {
                title: document.title,
                url: window.location.href,
                displayName: getTxt('h1[data-e2e="user-title"]') || getTxt('h1') || getTxt('h2[data-e2e="user-subtitle"]'),
                username: getTxt('h2[data-e2e="user-subtitle"]') || getTxt('h1[data-e2e="user-title"]') || getTxt('h2'),
                bio: getTxt('h2[data-e2e="user-bio"]') || getTxt('[data-e2e="user-bio"]') || getTxt('.user-bio'),
                link: getTxt('a[data-e2e="user-link"]') || getTxt('a[target="_blank"][rel*="nofollow"]') || getTxt('.user-link'),
                stats: {
                    following: getTxt('[data-e2e="following-count"]'),
                    followers: getTxt('[data-e2e="followers-count"]'),
                    likes: getTxt('[data-e2e="likes-count"]')
                },
                videoCount: document.querySelectorAll('[data-e2e="user-post-item"]').length
            };
        });

        console.log(`\n======================================================`);
        console.log(`📊 TIKTOK PROFILE AUDIT REPORT`);
        console.log(`======================================================`);
        console.log(`Display Name:`, profileData.displayName);
        console.log(`Username:`, profileData.username);
        console.log(`Bio:`, profileData.bio);
        console.log(`Link in Bio:`, profileData.link);
        console.log(`Stats:`, JSON.stringify(profileData.stats));
        console.log(`Public Video Count:`, profileData.videoCount);
        console.log(`======================================================\n`);

        await browser.close();
        return profileData;
    } catch (err) {
        console.error(`Audit error:`, err.message);
        await browser.close();
    }
}

inspectProfile().catch(console.error);

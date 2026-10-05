const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const humanEmulator = require('../services/human_emulator');
const personaEngine = require('../services/betty_persona_engine');
const bettyBehavior = require('../services/betty_behavior_simulator');
const InstagramSessionStorage = require('../services/instagram_session_storage');

const CONFIG_DIR = path.resolve(__dirname, '../../config');
const LEDGER_PATH = path.resolve(CONFIG_DIR, 'betty_activity_ledger.json');
const NICHE_INTELLIGENCE_PATH = path.resolve(CONFIG_DIR, 'betty_niche_intelligence.json');
const TWITTER_SESSION_PATH = path.resolve(CONFIG_DIR, 'twitter_session.json');
const INSTAGRAM_SESSION_PATH = path.resolve(CONFIG_DIR, 'instagram_session.json');

/**
 * Agent Betty Ryal (Hardened Production Version)
 * The Persona Herself: Self-Promotion, Organic Community Infiltration & Human Simulation.
 * Recreates genuine human browsing behavior down to physical mouse curves, reading pauses,
 * tangent distractions, selective engagement, and inbound conversational conversion to Fanvue.
 * Remediated & verified via Codebreakers Multi-Agent QA Protocol.
 */
class BettyAgent {
    constructor() {
        this.name = "Betty Ryal";
        this.role = "Persona Creator & Self-Promotion Organic Growth Agent";
        this.ledgerPath = LEDGER_PATH;
        this.intelligencePath = NICHE_INTELLIGENCE_PATH;
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
        
        this.loadLedger();
        this.loadIntelligence();
    }

    /**
     * Sanitizes external text strings against HTML/script injection
     */
    sanitizeText(str) {
        if (!str || typeof str !== 'string') return '';
        return str.replace(/[<>]/g, '').trim();
    }

    /**
     * Sanitizes hashtag strings for safe URL navigation
     */
    sanitizeTag(tag) {
        if (!tag || typeof tag !== 'string') return '';
        return tag.replace('#', '').replace(/[^\w-]/g, '').trim();
    }

    /**
     * Sanitizes user handles
     */
    sanitizeHandle(handle) {
        if (!handle || typeof handle !== 'string') return '';
        return handle.replace('@', '').replace(/[^\w._-]/g, '').trim();
    }

    /**
     * Normalizes action types to plural keys ('likes', 'comments', 'follows')
     */
    normalizeActionType(type) {
        const t = (type || '').toLowerCase();
        if (t === 'like' || t === 'likes') return 'likes';
        if (t === 'comment' || t === 'comments') return 'comments';
        if (t === 'follow' || t === 'follows') return 'follows';
        return 'likes';
    }

    loadLedger() {
        if (fs.existsSync(this.ledgerPath)) {
            try {
                this.ledger = JSON.parse(fs.readFileSync(this.ledgerPath, 'utf8'));
                return;
            } catch (e) {
                console.warn(`[BettyAgent] Warning loading ledger: ${e.message}`);
            }
        }
        this.ledger = {
            lastUpdated: new Date().toISOString(),
            interactedPosts: [],
            followedAccounts: [],
            conversationThreads: {},
            dailyActivity: {}
        };
        this.saveLedger();
    }

    saveLedger() {
        try {
            fs.writeFileSync(this.ledgerPath, JSON.stringify(this.ledger, null, 2), 'utf8');
        } catch (e) {
            console.error(`[BettyAgent] Error saving ledger: ${e.message}`);
        }
    }

    loadIntelligence() {
        if (fs.existsSync(this.intelligencePath)) {
            try {
                this.intelligence = JSON.parse(fs.readFileSync(this.intelligencePath, 'utf8'));
                return;
            } catch (e) {}
        }
        this.intelligence = {
            topAICompetitors: { instagram: [] },
            highConvertingNiches: [],
            antiBotHumanPhysics: {}
        };
    }

    /**
     * Check daily hard limits to prevent social platform algorithm triggers.
     * Normalized key lookup eliminates counter mismatch bug.
     */
    canActDaily(actionType) {
        const key = this.normalizeActionType(actionType);
        const today = new Date().toISOString().split('T')[0];
        
        if (!this.ledger.dailyActivity[today]) {
            this.ledger.dailyActivity[today] = { likes: 0, comments: 0, follows: 0 };
        }
        const counts = this.ledger.dailyActivity[today];

        const hardLimits = {
            likes: 30,
            comments: 6,
            follows: 12
        };

        return (counts[key] || 0) < (hardLimits[key] || 20);
    }

    recordDailyAction(actionType, targetId = null) {
        const key = this.normalizeActionType(actionType);
        const today = new Date().toISOString().split('T')[0];
        
        if (!this.ledger.dailyActivity[today]) {
            this.ledger.dailyActivity[today] = { likes: 0, comments: 0, follows: 0 };
        }
        this.ledger.dailyActivity[today][key] = (this.ledger.dailyActivity[today][key] || 0) + 1;

        if (key === 'likes' && targetId && !this.ledger.interactedPosts.includes(targetId)) {
            this.ledger.interactedPosts.push(targetId);
        } else if (key === 'follows' && targetId && !this.ledger.followedAccounts.includes(targetId)) {
            this.ledger.followedAccounts.push(targetId);
        }
        this.saveLedger();
    }

    /**
     * Launches a hardened, anti-bot stealth Playwright browser context
     */
    async launchStealthBrowser(platform = 'instagram', headless = true) {
        console.log(`[BettyAgent] 🛡️ Launching stealth browser for ${platform} (headless: ${headless})...`);

        let storageStatePath = null;
        if (platform.toLowerCase() === 'instagram') {
            InstagramSessionStorage.restore();
            storageStatePath = INSTAGRAM_SESSION_PATH;
        } else if (platform.toLowerCase() === 'twitter' || platform.toLowerCase() === 'x') {
            storageStatePath = TWITTER_SESSION_PATH;
        }

        const browser = await chromium.launch({
            headless: headless,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-infobars',
                '--window-position=0,0',
                '--ignore-certificate-errors',
                '--ignore-certificate-errors-spki-list'
            ]
        });

        const contextOptions = {
            userAgent: this.userAgent,
            viewport: {
                width: 1366 + Math.floor(Math.random() * 80),
                height: 768 + Math.floor(Math.random() * 60)
            },
            locale: 'en-US',
            timezoneId: 'Europe/London'
        };

        if (storageStatePath && fs.existsSync(storageStatePath)) {
            contextOptions.storageState = storageStatePath;
        }

        const context = await browser.newContext(contextOptions);
        const page = await context.newPage();
        await humanEmulator.injectStealth(page);

        return { browser, context, page };
    }

    /**
     * Dismiss Instagram popups safely
     */
    async dismissInstagramPopups(page) {
        try {
            const cookieBtns = await page.$$('button:has-text("Decline optional cookies"), button:has-text("Allow all cookies"), button:has-text("Only allow essential cookies"), button:has-text("Odrzuć opcjonalne")');
            for (const b of cookieBtns) {
                if (await b.isVisible().catch(() => false)) {
                    await b.click().catch(() => {});
                    await humanEmulator.randomDelay(800, 1500);
                }
            }

            const notNowBtns = await page.$$('button:has-text("Not Now"), button:has-text("Nie teraz"), button:has-text("Cancel"), button:has-text("Odrzuć")');
            for (const b of notNowBtns) {
                if (await b.isVisible().catch(() => false)) {
                    await b.click().catch(() => {});
                    await humanEmulator.randomDelay(800, 1500);
                }
            }
        } catch (e) {}
    }

    /**
     * Browses home feed naturally like a human with reading pauses and curiosity distractions
     */
    async browseInstagramFeed(page) {
        console.log(`\n[BettyAgent] 📰 Betty begins browsing her Instagram feed...`);
        try {
            await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 35000 });
            await humanEmulator.randomDelay(3000, 5000);
            await this.dismissInstagramPopups(page);

            const scrollRounds = Math.floor(Math.random() * 3) + 3; // 3 to 5 scrolls
            for (let r = 0; r < scrollRounds; r++) {
                if (!bettyBehavior.isSessionActive()) break;

                console.log(`[BettyAgent] 📜 Scrolling feed round ${r + 1}/${scrollRounds}...`);
                await bettyBehavior.humanBrowseScroll(page, 2);

                // Find visible articles/posts
                const articles = page.locator('article');
                const count = await articles.count().catch(() => 0);
                if (count > 0) {
                    const idx = Math.min(r, count - 1);
                    const currentPost = articles.nth(idx);
                    const rawPostText = await currentPost.innerText().catch(() => '');
                    const postText = this.sanitizeText(rawPostText);

                    // Evaluate curiosity drift / distraction
                    await bettyBehavior.evaluateAndExecuteDistraction(page, postText, async () => {
                        console.log(`[BettyAgent] 🌹 Betty is lingering over a beautiful feed item...`);
                        await bettyBehavior.gazePause(2);
                    });

                    // Occasional like if relevant
                    const shouldLike = Math.random() < 0.25;
                    if (shouldLike && this.canActDaily('likes')) {
                        const likeBtn = currentPost.locator('svg[aria-label="Like"], svg[aria-label="Lubię to!"]').first();
                        if (await likeBtn.isVisible().catch(() => false)) {
                            const liked = await bettyBehavior.safeLike(page, likeBtn);
                            if (liked) this.recordDailyAction('likes');
                        }
                    }
                }
            }
        } catch (err) {
            console.warn(`[BettyAgent] Notice during feed browsing: ${err.message}`);
        }
    }

    /**
     * Infiltrates top AI Influencer profiles, engages with their posts, and scouts their commenters
     */
    async scoutTopAIInfluencers(page) {
        console.log(`\n======================================================`);
        console.log(`👑 BETTY AGENT: TOP AI INFLUENCER COMMUNITY INFILTRATION`);
        console.log(`======================================================\n`);

        const competitors = this.intelligence.topAICompetitors.instagram || [];
        if (competitors.length === 0) return;

        // Pick 1-2 competitors to visit during this session
        const rawTarget = competitors[Math.floor(Math.random() * competitors.length)];
        const targetHandle = this.sanitizeHandle(rawTarget.handle);
        const targetName = this.sanitizeText(rawTarget.name);
        
        console.log(`[BettyAgent] 🎯 Target AI Influencer selected: @${targetHandle} (${targetName})`);
        console.log(`[BettyAgent] 💡 Angle: "${rawTarget.interactionAngle}"`);

        try {
            await page.goto(`https://www.instagram.com/${targetHandle}/`, { waitUntil: 'domcontentloaded', timeout: 35000 });
            await humanEmulator.randomDelay(3500, 6000);
            await this.dismissInstagramPopups(page);

            // Gaze at their grid like an admirer
            console.log(`[BettyAgent] 👗 Betty gazes at @${targetHandle}'s aesthetic grid...`);
            await bettyBehavior.humanBrowseScroll(page, 2);
            await bettyBehavior.gazePause(2);

            // Click the first or second post
            const postLinks = page.locator('article a[href*="/p/"]');
            const postCount = await postLinks.count().catch(() => 0);
            if (postCount === 0) {
                console.log(`[BettyAgent] No accessible posts found on @${targetHandle}'s profile.`);
                return;
            }

            const chosenPostLink = postLinks.nth(Math.floor(Math.random() * Math.min(postCount, 3)));
            const postHref = await chosenPostLink.getAttribute('href').catch(() => '');
            console.log(`[BettyAgent] 📸 Opening post: https://www.instagram.com${postHref}`);
            await humanEmulator.humanClick(page, chosenPostLink);
            await humanEmulator.randomDelay(3000, 5000);

            // Read post details
            const modal = page.locator('div[role="dialog"]');
            const captionEl = modal.locator('h1, span._ap3a').first();
            const rawCaption = await captionEl.innerText().catch(() => '');
            const caption = this.sanitizeText(rawCaption);

            // 1. Like the post (if not already liked)
            if (this.canActDaily('likes')) {
                const likeBtn = modal.locator('svg[aria-label="Like"], svg[aria-label="Lubię to!"]').first();
                if (await likeBtn.isVisible().catch(() => false)) {
                    const liked = await bettyBehavior.safeLike(page, likeBtn);
                    if (liked) this.recordDailyAction('likes', postHref);
                }
            }

            // 2. Leave an authentic in-character comment praising the creator
            if (this.canActDaily('comments')) {
                const commentInput = modal.locator('textarea[aria-label="Add a comment..."], textarea[placeholder*="comment"]').first();
                if (await commentInput.isVisible().catch(() => false)) {
                    console.log(`[BettyAgent] ✍️ Crafting in-character compliment for @${targetHandle}...`);
                    const comment = await personaEngine.generateComment({
                        creatorName: targetHandle,
                        caption: caption || targetName,
                        platform: 'instagram'
                    });
                    const commented = await bettyBehavior.safeComment(page, commentInput, comment);
                    if (commented) this.recordDailyAction('comments', postHref);
                }
            }

            // 3. Scout engaged commenters (Warm Target Audience)
            console.log(`[BettyAgent] 🔍 Scouting active admirers and commenters under the post...`);
            const commentAuthors = modal.locator('ul li a[role="link"][href^="/"]');
            const authorCount = await commentAuthors.count().catch(() => 0);
            console.log(`[BettyAgent] Found ${authorCount} visible commenter handles.`);

            let followedCount = 0;
            for (let i = 0; i < Math.min(authorCount, 8); i++) {
                if (followedCount >= 2 || !this.canActDaily('follows')) break;

                const authorLink = commentAuthors.nth(i);
                const rawHandle = await authorLink.innerText().catch(() => '');
                const handle = this.sanitizeHandle(rawHandle);

                // Skip target creator herself and already followed accounts
                if (!handle || handle === targetHandle || this.ledger.followedAccounts.includes(handle)) {
                    continue;
                }

                console.log(`[BettyAgent] 🧐 Inspecting potential admirer: @${handle}`);
                const box = await authorLink.boundingBox().catch(() => null);
                if (box) {
                    await humanEmulator.bezierMouseMove(page, box.x + box.width / 2, box.y + box.height / 2);
                    await humanEmulator.randomDelay(1200, 2500);
                }

                // Follow candidate
                const followPopoverBtn = page.locator('div[role="tooltip"] button:has-text("Follow"), button:has-text("Obserwuj")').first();
                if (await followPopoverBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
                    const followed = await bettyBehavior.safeFollow(page, followPopoverBtn, handle);
                    if (followed) {
                        this.recordDailyAction('follows', handle);
                        followedCount++;
                    }
                }
            }

            // Close dialog
            const closeBtn = page.locator('svg[aria-label="Close"], svg[aria-label="Zamknij"]').first();
            if (await closeBtn.isVisible().catch(() => false)) {
                await humanEmulator.humanClick(page, closeBtn);
                await humanEmulator.randomDelay(1500, 3000);
            }
        } catch (err) {
            console.warn(`[BettyAgent] Notice during AI influencer scouting: ${err.message}`);
        }
    }

    /**
     * Explores high-converting subculture niches (Fanny Hill, Corsets/Stays, Old Money, Gothic Romance)
     */
    async scoutNiches(page) {
        console.log(`\n======================================================`);
        console.log(`🕯️ BETTY AGENT: SUBCULTURE & NICHE EXPLORATION`);
        console.log(`======================================================\n`);

        const niches = this.intelligence.highConvertingNiches || [];
        if (niches.length === 0) return;

        const chosenNiche = niches[Math.floor(Math.random() * niches.length)];
        const rawTag = chosenNiche.hashtags[Math.floor(Math.random() * chosenNiche.hashtags.length)];
        const tag = this.sanitizeTag(rawTag);
        
        console.log(`[BettyAgent] 🎯 Exploring Niche: ${chosenNiche.name}`);
        console.log(`[BettyAgent] 🔍 Searching hashtag: #${tag}`);

        try {
            await page.goto(`https://www.instagram.com/explore/tags/${tag}/`, { waitUntil: 'domcontentloaded', timeout: 35000 });
            await humanEmulator.randomDelay(3500, 6000);
            await this.dismissInstagramPopups(page);

            // Browse through posts in this niche
            await bettyBehavior.humanBrowseScroll(page, 3);
            await bettyBehavior.gazePause(2);

            // Trigger potential curiosity distraction
            await bettyBehavior.evaluateAndExecuteDistraction(page, `${chosenNiche.name} ${tag}`, async () => {
                console.log(`[BettyAgent] ✨ Betty paused deeply on a #${tag} composition!`);
                await bettyBehavior.gazePause(3);
            });
        } catch (err) {
            console.warn(`[BettyAgent] Notice during niche exploration: ${err.message}`);
        }
    }

    /**
     * Checks unread inbound DMs and replies in-character with gentle Fanvue conversion
     */
    async checkInboundDMs(page) {
        console.log(`\n======================================================`);
        console.log(`💌 BETTY AGENT: INBOUND DIRECT MESSAGES & CONVERSATION`);
        console.log(`======================================================\n`);

        try {
            await page.goto('https://www.instagram.com/direct/inbox/', { waitUntil: 'domcontentloaded', timeout: 35000 });
            await humanEmulator.randomDelay(3500, 6000);
            await this.dismissInstagramPopups(page);

            const threadLocators = page.locator('div[role="listitem"], div[role="row"]');
            const count = await threadLocators.count().catch(() => 0);
            console.log(`[BettyAgent] Inbox loaded. Found ${count} visible conversation threads.`);

            if (count > 0) {
                const firstThread = threadLocators.first();
                await humanEmulator.humanClick(page, firstThread);
                await humanEmulator.randomDelay(2500, 4500);

                const messages = page.locator('div[role="none"] span, div[dir="auto"]');
                const msgCount = await messages.count().catch(() => 0);
                if (msgCount > 0) {
                    const rawLastMsg = await messages.last().innerText().catch(() => '');
                    const lastMsg = this.sanitizeText(rawLastMsg);
                    console.log(`[BettyAgent] Last message in thread: "${lastMsg.substring(0, 100)}"`);

                    const reply = await personaEngine.generateInboundReply({
                        senderName: 'an admirer',
                        incomingMessage: lastMsg,
                        turnNumber: 1
                    });
                    console.log(`[BettyAgent] ✍️ Betty drafted reply: "${reply}"`);
                    console.log(`[BettyAgent] 🔒 Inbound reply primed and ready for delivery.`);
                }
            } else {
                console.log(`[BettyAgent] No unread inbound DMs found at this time.`);
            }
        } catch (err) {
            console.warn(`[BettyAgent] Notice during DM check: ${err.message}`);
        }
    }

    /**
     * Runs a complete autonomous human session
     * @param {Object} options
     * @param {string} [options.platform='instagram']
     * @param {boolean} [options.headless=true]
     * @param {boolean} [options.dryRun=false]
     */
    async runAutonomousSession(options = {}) {
        const { platform = 'instagram', headless = true, dryRun = false } = options;

        console.log(`\n======================================================`);
        console.log(`🌹 AGENT BETTY RYAL: STARTING AUTONOMOUS HUMAN SESSION`);
        console.log(`Platform: ${platform} | Mode: ${dryRun ? 'DRY-RUN / AUDIT' : 'LIVE PRODUCTION'}`);
        console.log(`Time: ${new Date().toISOString()}`);
        console.log(`======================================================\n`);

        const session = bettyBehavior.startSession(platform);

        if (dryRun) {
            console.log(`[BettyAgent] 🧪 RUNNING IN DRY-RUN / CALIBRATION MODE:`);
            console.log(`   Session planned: ${(session.durationMs / 60000).toFixed(1)} minutes`);
            console.log(`   Max Likes Cap: ${session.limits.maxLikes}`);
            console.log(`   Max Comments Cap: ${session.limits.maxComments}`);
            console.log(`   Max Follows Cap: ${session.limits.maxFollows}`);
            
            const sampleComment = await personaEngine.generateComment({
                creatorName: 'fit_aitana',
                caption: 'Sunny morning in Madrid before workout!',
                platform: 'instagram'
            });
            console.log(`   Sample Betty Comment on Aitana: "${sampleComment}"`);

            const sampleDM = await personaEngine.generateInboundReply({
                senderName: 'Lord Edward',
                incomingMessage: 'Where have you been all my life? You are stunning.',
                turnNumber: 1
            });
            console.log(`   Sample Inbound DM Reply: "${sampleDM}"`);

            const distractionTest = personaEngine.evaluateDistractionTrigger("Walking through the opulent halls of Versailles in a 1950s Dior vintage ballgown.");
            console.log(`   Distraction Evaluation: Triggered=${distractionTest.triggersDistraction} (${distractionTest.category})`);

            const summary = bettyBehavior.endSession();

            // Automatically dispatch email report if requested
            if (options.sendEmail) {
                try {
                    const NotificationService = require('../services/notification_service');
                    const notifier = new NotificationService({ recipient: 'janosgolya@gmail.com' });
                    await notifier.sendBettyInteractionReport({
                        platform,
                        summary,
                        details: {
                            sampleComment: sampleComment || null,
                            inboundDMReply: sampleDM || null
                        },
                        errors: []
                    });
                } catch (notifyErr) {
                    console.error(`[BettyAgent] Email dispatch note:`, notifyErr.message);
                }
            }

            return { 
                success: true, 
                dryRun: true, 
                summary,
                details: {
                    sampleComment,
                    inboundDMReply: sampleDM
                }
            };
        }

        // Live Execution
        let browserBundle = null;
        try {
            browserBundle = await this.launchStealthBrowser(platform, headless);
            const { page } = browserBundle;

            // 1. Check inbound DMs first
            await this.checkInboundDMs(page);

            // 2. Browse Feed with human pauses & curiosity distractions
            if (bettyBehavior.isSessionActive()) {
                await this.browseInstagramFeed(page);
            }

            // 3. Scout Top AI Influencers & engage with their audience
            if (bettyBehavior.isSessionActive()) {
                await this.scoutTopAIInfluencers(page);
            }

            // 4. Explore High-Converting Niches
            if (bettyBehavior.isSessionActive()) {
                await this.scoutNiches(page);
            }

            const summary = bettyBehavior.endSession();

            // Automatically send email report to user after session
            try {
                const NotificationService = require('../services/notification_service');
                const notifier = new NotificationService({ recipient: 'janosgolya@gmail.com' });
                await notifier.sendBettyInteractionReport({
                    platform,
                    summary,
                    details: {
                        sampleComment: this.lastGeneratedComment || null,
                        inboundDMReply: this.lastInboundReply || null
                    },
                    errors: this.sessionErrors || []
                });
            } catch (notifyErr) {
                console.error(`[BettyAgent] Email dispatch note:`, notifyErr.message);
            }

            return { success: true, summary };
        } catch (err) {
            console.error(`[BettyAgent] ❌ Fatal error in autonomous session: ${err.message}`);
            bettyBehavior.endSession();

            try {
                const NotificationService = require('../services/notification_service');
                const notifier = new NotificationService({ recipient: 'janosgolya@gmail.com' });
                await notifier.sendBettyInteractionReport({
                    platform,
                    summary: bettyBehavior.sessionStats,
                    details: {},
                    errors: [err.message]
                });
            } catch (notifyErr) {}

            return { success: false, error: err.message };
        } finally {
            if (browserBundle && browserBundle.browser) {
                await browserBundle.browser.close().catch(() => {});
            }
        }
    }
}

// CLI runner
if (require.main === module) {
    const args = process.argv.slice(2);
    const betty = new BettyAgent();

    if (args.includes('--dry-run') || args.includes('-d')) {
        betty.runAutonomousSession({ dryRun: true }).catch(console.error);
    } else if (args.includes('--live')) {
        betty.runAutonomousSession({ dryRun: false, headless: true }).catch(console.error);
    } else {
        betty.runAutonomousSession({ dryRun: true }).catch(console.error);
    }
}

module.exports = BettyAgent;

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const humanEmulator = require('./human_emulator');
const targetRadar = require('./target_radar');
const tom = require('../agents/tom');

const TWITTER_SESSION = path.join(__dirname, '../../config/twitter_session.json');
const REDDIT_SESSION = path.join(__dirname, '../../config/reddit_session.json');

/**
 * TomLiveRunner
 * Executes live online scouting and human-emulated engagement across social networks.
 */
class TomLiveRunner {
    constructor() {
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
    }

    /**
     * Executes a live Twitter scouting & targeted engagement session
     * @param {Object} options
     * @param {boolean} [options.performLike=true]
     * @param {boolean} [options.performReply=false]
     */
    async executeTwitterLiveSession(options = {}) {
        console.log('\n======================================================');
        console.log('🐦 TOM LIVE: EXECUTING TWITTER / X TARGET ENGAGEMENT');
        console.log('======================================================\n');

        if (!fs.existsSync(TWITTER_SESSION)) {
            throw new Error(`Twitter session file missing at ${TWITTER_SESSION}`);
        }

        const browser = await chromium.launch({
            headless: true,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });

        const context = await browser.newContext({
            storageState: TWITTER_SESSION,
            viewport: { width: 1440, height: 900 },
            userAgent: this.userAgent
        });

        const page = await context.newPage();
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });

        try {
            console.log('🌐 Loading X.com Home & Feed...');
            await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 35000 });
            await humanEmulator.randomDelay(3000, 5000);

            // Dismiss cookie banner if visible
            const cookieBtn = page.locator('button:has-text("Accept all cookies"), button:has-text("Refuse non-essential cookies")').first();
            if (await cookieBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await cookieBtn.click().catch(() => {});
                await humanEmulator.randomDelay(1000, 2000);
            }

            console.log('🔍 Scouting Target Niche: #Bridgerton & #HistoricalRomance...');
            const searchQuery = encodeURIComponent('#Bridgerton OR #HistoricalRomance OR #PeriodDrama');
            await page.goto(`https://x.com/search?q=${searchQuery}&f=live`, { waitUntil: 'domcontentloaded', timeout: 35000 });
            await humanEmulator.randomDelay(4000, 6000);

            console.log('📜 Simulating human reading scroll down search results...');
            await humanEmulator.naturalScroll(page, 3);
            await humanEmulator.randomDelay(2000, 4000);

            // Extract visible tweets
            const tweetElements = page.locator('article[data-testid="tweet"]');
            const count = await tweetElements.count();
            console.log(`🔎 Found ${count} candidate tweets in target subculture feed.`);

            let selectedTweet = null;
            let bestScore = 0;

            for (let i = 0; i < Math.min(count, 6); i++) {
                const tweetEl = tweetElements.nth(i);
                const text = await tweetEl.innerText().catch(() => '');
                const evalResult = targetRadar.evaluateAudienceMatch(text);
                
                if (evalResult.score >= bestScore) {
                    bestScore = evalResult.score;
                    selectedTweet = {
                        index: i,
                        text: text.replace(/\n+/g, ' ').substring(0, 140),
                        score: evalResult.score,
                        keywords: evalResult.matchedKeywords,
                        element: tweetEl
                    };
                }
            }

            if (selectedTweet) {
                console.log(`\n🎯 BEST TARGET TWEET IDENTIFIED (Score: ${selectedTweet.score}/100):`);
                console.log(`   "${selectedTweet.text}..."`);
                console.log(`   Keywords: ${selectedTweet.keywords.join(', ') || 'Period Drama / Romance'}`);

                // Generate in-character comment
                const reply = await tom.generateInCharacterEngagement(selectedTweet.text, 'twitter');
                console.log(`\n💬 Tom Drafted In-Character Engagement:`);
                console.log(`   "${reply.comment}"`);

                // Perform Human Like if enabled
                if (options.performLike !== false) {
                    console.log('\n❤️ Performing human-emulated like on target tweet...');
                    const likeBtn = selectedTweet.element.locator('button[data-testid="like"]').first();
                    if (await likeBtn.isVisible().catch(() => false)) {
                        const box = await likeBtn.boundingBox();
                        if (box) {
                            await humanEmulator.bezierMouseMove(page, box.x + box.width / 2, box.y + box.height / 2);
                            await humanEmulator.randomDelay(400, 800);
                            await likeBtn.click();
                            console.log('✅ Target tweet liked successfully!');
                            await humanEmulator.randomDelay(2000, 4000);
                        }
                    }
                }
            }

            const screenshotPath = path.join(__dirname, '../../config/tom_twitter_live_engagement.png');
            await page.screenshot({ path: screenshotPath });
            console.log(`\n📸 Live session screenshot saved to: ${screenshotPath}`);

            // Save fresh storage state
            const fullState = await context.storageState();
            fs.writeFileSync(TWITTER_SESSION, JSON.stringify(fullState, null, 2), 'utf8');

            return {
                platform: 'Twitter',
                success: true,
                scoutedTweetsCount: count,
                selectedTweet: selectedTweet ? { text: selectedTweet.text, score: selectedTweet.score } : null,
                screenshot: screenshotPath
            };
        } catch (error) {
            console.error('❌ Error in Tom Twitter live session:', error.message);
            const errScreenshot = path.join(__dirname, '../../config/tom_twitter_live_error.png');
            await page.screenshot({ path: errScreenshot }).catch(() => {});
            return {
                platform: 'Twitter',
                success: false,
                error: error.message,
                screenshot: errScreenshot
            };
        } finally {
            await browser.close();
        }
    }

    /**
     * Executes a live Reddit scouting session
     */
    async executeRedditLiveSession() {
        console.log('\n======================================================');
        console.log('🤖 TOM LIVE: EXECUTING REDDIT TARGET SCOUTING');
        console.log('======================================================\n');

        const browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const context = await browser.newContext({
            storageState: fs.existsSync(REDDIT_SESSION) ? REDDIT_SESSION : undefined,
            viewport: { width: 1440, height: 900 },
            userAgent: this.userAgent
        });

        const page = await context.newPage();
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });

        try {
            console.log('🌐 Navigating to r/HistoricalCostuming...');
            await page.goto('https://www.reddit.com/r/HistoricalCostuming/hot/', { waitUntil: 'domcontentloaded', timeout: 35000 });
            await humanEmulator.randomDelay(3000, 5000);

            await humanEmulator.naturalScroll(page, 2);
            await humanEmulator.randomDelay(2000, 3000);

            const screenshotPath = path.join(__dirname, '../../config/tom_reddit_live_scout.png');
            await page.screenshot({ path: screenshotPath });
            console.log(`📸 Reddit scout screenshot saved to: ${screenshotPath}`);

            return {
                platform: 'Reddit',
                success: true,
                screenshot: screenshotPath
            };
        } catch (error) {
            console.error('❌ Error in Tom Reddit live session:', error.message);
            return { platform: 'Reddit', success: false, error: error.message };
        } finally {
            await browser.close();
        }
    }
}

module.exports = new TomLiveRunner();

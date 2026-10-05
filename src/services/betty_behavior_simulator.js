const humanEmulator = require('./human_emulator');
const personaEngine = require('./betty_persona_engine');

/**
 * BettyBehaviorSimulator
 * Advanced human psychology & physics simulator for Betty Ryal.
 * Simulates genuine human curiosity, reading rhythm, micro-scrolls,
 * tangent distractions, and strict anti-bot safety governors.
 */
class BettyBehaviorSimulator {
    constructor() {
        this.activeSession = null;
        this.sessionStats = {
            likes: 0,
            comments: 0,
            follows: 0,
            distractionsCount: 0,
            postsViewed: 0,
            startTime: null
        };
    }

    /**
     * Plans a randomized session duration (between 7 and 45 minutes, with occasional quick 5-min checks)
     * @returns {number} Session duration in milliseconds
     */
    planSessionDurationMs() {
        const roll = Math.random();
        let minutes;
        if (roll < 0.25) {
            // Quick check (5 - 10 minutes)
            minutes = Math.floor(Math.random() * 6) + 5;
        } else if (roll < 0.75) {
            // Standard leisurely browsing (15 - 30 minutes)
            minutes = Math.floor(Math.random() * 16) + 15;
        } else {
            // Immersive evening exploration (35 - 55 minutes)
            minutes = Math.floor(Math.random() * 21) + 35;
        }
        return minutes * 60 * 1000;
    }

    /**
     * Starts tracking a new browsing session
     */
    startSession(platform = 'instagram') {
        const durationMs = this.planSessionDurationMs();
        this.activeSession = {
            platform,
            startTime: Date.now(),
            durationMs,
            endTime: Date.now() + durationMs,
            limits: {
                maxLikes: Math.floor(Math.random() * 5) + 8, // 8-12
                maxComments: Math.floor(Math.random() * 2) + 1, // 1-2
                maxFollows: Math.floor(Math.random() * 3) + 2 // 2-4
            }
        };

        this.sessionStats = {
            likes: 0,
            comments: 0,
            follows: 0,
            distractionsCount: 0,
            postsViewed: 0,
            startTime: Date.now()
        };

        const durationMinutes = (durationMs / 60000).toFixed(1);
        console.log(`[BettyBehavior] 🕯️ Betty sits down to browse ${platform}. Session duration: ${durationMinutes} mins.`);
        return this.activeSession;
    }

    /**
     * Checks if current session time or limits are exhausted
     */
    isSessionActive() {
        if (!this.activeSession) return false;
        const now = Date.now();
        if (now >= this.activeSession.endTime) {
            console.log(`[BettyBehavior] ⏰ Session time limit reached (${(this.activeSession.durationMs / 60000).toFixed(1)}m). Wrapping up.`);
            return false;
        }
        return true;
    }

    /**
     * Natural browsing scroll with human micro-pauses and occasional reverse scroll (glancing back)
     * @param {import('playwright').Page} page
     * @param {number} pulses - Number of scroll pulses
     */
    async humanBrowseScroll(page, pulses = 2) {
        if (!page) return;

        for (let i = 0; i < pulses; i++) {
            const distance = Math.floor(Math.random() * 320) + 180;
            const steps = Math.floor(Math.random() * 6) + 5;
            
            for (let s = 0; s < steps; s++) {
                try {
                    await page.mouse.wheel(0, distance / steps);
                    await humanEmulator.randomDelay(20, 50);
                } catch (e) {
                    break;
                }
            }

            // Gaze pause at current position
            const readingTime = Math.floor(Math.random() * 2200) + 1400;
            await new Promise(resolve => setTimeout(resolve, readingTime));

            // 20% chance of human reverse scroll: scrolled past something interesting, scroll up a bit
            if (Math.random() < 0.20) {
                const backDistance = Math.floor(Math.random() * 140) + 70;
                for (let b = 0; b < 3; b++) {
                    try {
                        await page.mouse.wheel(0, -(backDistance / 3));
                        await humanEmulator.randomDelay(25, 60);
                    } catch (e) {
                        break;
                    }
                }
                await humanEmulator.randomDelay(1500, 3000);
            }
        }
        this.sessionStats.postsViewed += pulses;
    }

    /**
     * Simulates Betty pausing to intently gaze at a visual or read a caption
     * @param {number} intensity - 1 (quick glance), 2 (admiring), 3 (captivated)
     */
    async gazePause(intensity = 1) {
        let min = 1500;
        let max = 3500;
        if (intensity === 2) {
            min = 3500;
            max = 7000;
        } else if (intensity === 3) {
            min = 7000;
            max = 14000;
        }
        await humanEmulator.randomDelay(min, max);
    }

    /**
     * Evaluates and executes Betty's "Distraction / Curiosity Drift" mechanic.
     * If an interesting item catches her eye, she leaves the main thread, inspects it, and returns.
     * @param {import('playwright').Page} page
     * @param {string} captionOrText
     * @param {Function} detourActionCallback - Async callback to perform during the distraction
     * @returns {Promise<boolean>} True if distraction occurred
     */
    async evaluateAndExecuteDistraction(page, captionOrText, detourActionCallback = null) {
        if (!this.isSessionActive()) return false;

        const evalResult = personaEngine.evaluateDistractionTrigger(captionOrText);
        if (!evalResult.triggersDistraction) return false;

        // Roll 30% chance for Betty to actually get distracted
        if (Math.random() > 0.30) return false;

        console.log(`\n[BettyBehavior] ✨ CURIOSITY DRIFT: Betty got distracted by [${evalResult.category}] ("${evalResult.matchedKeyword}")!`);
        console.log(`[BettyBehavior] 🥀 She wanders away from her main path to indulge her curiosity...`);
        this.sessionStats.distractionsCount++;

        // Lingering pause
        await this.gazePause(2);

        // Execute detour if provided
        if (typeof detourActionCallback === 'function') {
            try {
                await detourActionCallback();
            } catch (err) {
                console.warn(`[BettyBehavior] Detour notice: ${err.message}`);
            }
        }

        // Leisurely linger before remembering her main task
        const lingerSec = Math.floor(Math.random() * 20) + 15;
        console.log(`[BettyBehavior] ⏳ Betty spends ${lingerSec}s admiring this before returning to her main search...`);
        await new Promise(resolve => setTimeout(resolve, lingerSec * 1000));

        console.log(`[BettyBehavior] 📜 Betty returns to her primary path.`);
        return true;
    }

    /**
     * Safe Like executor with strict cooldown and session limits
     * @param {import('playwright').Page} page
     * @param {import('playwright').Locator|string} likeButtonLocator
     * @returns {Promise<boolean>}
     */
    async safeLike(page, likeButtonLocator) {
        if (!this.activeSession) return false;
        if (this.sessionStats.likes >= this.activeSession.limits.maxLikes) {
            console.log(`[BettyBehavior] 🛑 Max likes limit reached for this session (${this.activeSession.limits.maxLikes}). Skipping.`);
            return false;
        }

        try {
            await humanEmulator.humanClick(page, likeButtonLocator);
            this.sessionStats.likes++;
            console.log(`[BettyBehavior] ❤️ Betty liked a post (${this.sessionStats.likes}/${this.activeSession.limits.maxLikes}).`);
            
            // Anti-ban cooling interval (40 - 80s)
            await humanEmulator.actionPacingDelay(40, 80);
            return true;
        } catch (err) {
            console.error(`[BettyBehavior] Error executing safe like: ${err.message}`);
            return false;
        }
    }

    /**
     * Safe Comment executor with human typing rhythm and strict cooldown
     * @param {import('playwright').Page} page
     * @param {import('playwright').Locator|string} commentInputLocator
     * @param {string} commentText
     * @param {import('playwright').Locator|string} [submitButtonLocator=null]
     * @returns {Promise<boolean>}
     */
    async safeComment(page, commentInputLocator, commentText, submitButtonLocator = null) {
        if (!this.activeSession) return false;
        if (this.sessionStats.comments >= this.activeSession.limits.maxComments) {
            console.log(`[BettyBehavior] 🛑 Max comments limit reached for this session (${this.activeSession.limits.maxComments}). Skipping.`);
            return false;
        }

        try {
            console.log(`[BettyBehavior] 💬 Betty is typing a comment: "${commentText}"`);
            await humanEmulator.humanType(page, commentInputLocator, commentText);
            await humanEmulator.randomDelay(1000, 2500);

            if (submitButtonLocator) {
                await humanEmulator.humanClick(page, submitButtonLocator);
            } else {
                await page.keyboard.press('Enter');
            }

            this.sessionStats.comments++;
            console.log(`[BettyBehavior] 💌 Comment submitted successfully (${this.sessionStats.comments}/${this.activeSession.limits.maxComments}).`);

            // Anti-ban long cooling interval (90 - 180s)
            await humanEmulator.actionPacingDelay(90, 180);
            return true;
        } catch (err) {
            console.error(`[BettyBehavior] Error executing safe comment: ${err.message}`);
            return false;
        }
    }

    /**
     * Safe Follow executor
     * @param {import('playwright').Page} page
     * @param {import('playwright').Locator|string} followButtonLocator
     * @param {string} targetUsername
     * @returns {Promise<boolean>}
     */
    async safeFollow(page, followButtonLocator, targetUsername = '') {
        if (!this.activeSession) return false;
        if (this.sessionStats.follows >= this.activeSession.limits.maxFollows) {
            console.log(`[BettyBehavior] 🛑 Max follows limit reached for this session (${this.activeSession.limits.maxFollows}). Skipping.`);
            return false;
        }

        try {
            await humanEmulator.humanClick(page, followButtonLocator);
            this.sessionStats.follows++;
            console.log(`[BettyBehavior] 🤝 Betty followed @${targetUsername} (${this.sessionStats.follows}/${this.activeSession.limits.maxFollows}).`);

            // Pacing delay (50 - 100s)
            await humanEmulator.actionPacingDelay(50, 100);
            return true;
        } catch (err) {
            console.error(`[BettyBehavior] Error executing safe follow: ${err.message}`);
            return false;
        }
    }

    /**
     * Concludes session and prints summary
     */
    endSession() {
        const elapsedSec = Math.floor((Date.now() - (this.sessionStats.startTime || Date.now())) / 1000);
        console.log(`\n======================================================`);
        console.log(`🕯️ BETTY BEHAVIOR SIMULATOR: SESSION CONCLUDED`);
        console.log(`Time Active: ${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s`);
        console.log(`Posts Viewed: ${this.sessionStats.postsViewed}`);
        console.log(`Likes Given: ${this.sessionStats.likes}`);
        console.log(`Comments Left: ${this.sessionStats.comments}`);
        console.log(`Accounts Followed: ${this.sessionStats.follows}`);
        console.log(`Curiosity Distractions: ${this.sessionStats.distractionsCount}`);
        console.log(`======================================================\n`);
        
        const summary = { ...this.sessionStats, durationSeconds: elapsedSec };
        this.activeSession = null;
        return summary;
    }
}

module.exports = new BettyBehaviorSimulator();

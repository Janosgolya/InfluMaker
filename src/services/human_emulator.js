/**
 * HumanEmulator
 * Advanced browser physics simulator to bypass bot detection on Instagram, X, Reddit, and TikTok.
 */
class HumanEmulator {
    /**
     * Sleep with randomized human jitter
     * @param {number} minMs - Minimum milliseconds
     * @param {number} maxMs - Maximum milliseconds
     */
    async randomDelay(minMs = 2000, maxMs = 5000) {
        const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Long cooling delay between major social actions (anti-ban safety)
     */
    async actionPacingDelay(minSec = 45, maxSec = 95) {
        const sec = Math.floor(Math.random() * (maxSec - minSec + 1)) + minSec;
        console.log(`[HumanEmulator] ⏳ Human pacing cooldown: waiting ${sec}s before next interaction...`);
        await new Promise(resolve => setTimeout(resolve, sec * 1000));
    }

    /**
     * Simulates natural human reading scroll with acceleration and deceleration
     * @param {import('playwright').Page} page
     * @param {number} scrollCount - How many scroll pulses to perform
     */
    async naturalScroll(page, scrollCount = 3) {
        for (let i = 0; i < scrollCount; i++) {
            const distance = Math.floor(Math.random() * 350) + 150;
            const steps = Math.floor(Math.random() * 8) + 5;
            
            for (let s = 0; s < steps; s++) {
                await page.mouse.wheel(0, distance / steps);
                await this.randomDelay(30, 80);
            }
            
            // Human reading pause after scroll
            const readingPause = Math.floor(Math.random() * 2500) + 1500;
            await new Promise(resolve => setTimeout(resolve, readingPause));
        }
    }

    /**
     * Moves mouse along a realistic curved path rather than a straight robotic line
     * @param {import('playwright').Page} page
     * @param {number} targetX
     * @param {number} targetY
     */
    async bezierMouseMove(page, targetX, targetY) {
        const startX = Math.floor(Math.random() * 300) + 100;
        const startY = Math.floor(Math.random() * 300) + 100;
        
        // Control point for quadratic curve
        const controlX = (startX + targetX) / 2 + (Math.random() * 100 - 50);
        const controlY = (startY + targetY) / 2 + (Math.random() * 100 - 50);

        const steps = 15;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            // Quadratic Bézier formula: B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
            const curX = Math.round(Math.pow(1 - t, 2) * startX + 2 * (1 - t) * t * controlX + Math.pow(t, 2) * targetX);
            const curY = Math.round(Math.pow(1 - t, 2) * startY + 2 * (1 - t) * t * controlY + Math.pow(t, 2) * targetY);
            
            await page.mouse.move(curX, curY);
            await this.randomDelay(10, 25);
        }
    }

    /**
     * Types text with human-like rhythm, variable cadence, and occasional typo corrections
     * @param {import('playwright').Page} page
     * @param {string} selector
     * @param {string} text
     */
    async humanType(page, selector, text) {
        const element = page.locator(selector).first();
        await element.click();
        await this.randomDelay(300, 700);

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            
            // 2% chance of simulated human typo and backspace correction
            if (Math.random() < 0.02 && char.match(/[a-z]/i)) {
                const wrongChar = String.fromCharCode(char.charCodeAt(0) + 1);
                await page.keyboard.type(wrongChar);
                await this.randomDelay(120, 300);
                await page.keyboard.press('Backspace');
                await this.randomDelay(150, 400);
            }

            await page.keyboard.type(char);
            
            // Punctuation pause vs regular letter pause
            if (['.', ',', '!', '?', '…'].includes(char)) {
                await this.randomDelay(250, 600);
            } else if (char === ' ') {
                await this.randomDelay(70, 180);
            } else {
                await this.randomDelay(35, 110);
            }
        }
    }
}

module.exports = new HumanEmulator();

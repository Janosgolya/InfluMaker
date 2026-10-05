/**
 * HumanEmulator (Hardened Production Version)
 * Advanced browser physics simulator to bypass bot detection on TikTok, X (Twitter), Instagram, Reddit, and Pinterest.
 * Remediated and verified via Codebreakers Multi-Agent QA Protocol.
 */
class HumanEmulator {
    /**
     * Sleep with randomized human jitter
     * @param {number} minMs - Minimum milliseconds
     * @param {number} maxMs - Maximum milliseconds
     */
    async randomDelay(minMs = 2000, maxMs = 5000) {
        const min = Math.max(0, minMs);
        const max = Math.max(min, maxMs);
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Long cooling delay between major social actions (anti-ban safety)
     * @param {number} minSec - Minimum seconds
     * @param {number} maxSec - Maximum seconds
     */
    async actionPacingDelay(minSec = 45, maxSec = 95) {
        const sec = Math.floor(Math.random() * (maxSec - minSec + 1)) + minSec;
        console.log(`[HumanEmulator] ⏳ Human pacing cooldown: waiting ${sec}s before next interaction...`);
        await new Promise(resolve => setTimeout(resolve, sec * 1000));
    }

    /**
     * Injects comprehensive anti-bot stealth scripts into page before navigation
     * @param {import('playwright').Page} page
     */
    async injectStealth(page) {
        if (!page) throw new Error('[HumanEmulator] Page instance required for stealth injection.');

        await page.addInitScript(() => {
            // Mask webdriver
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
                configurable: true
            });

            // Mock full Chrome runtime
            window.chrome = {
                runtime: {
                    PlatformOs: { MAC: 'mac', WIN: 'win', ANDROID: 'android', CROS: 'cros', LINUX: 'linux', OPENBSD: 'openbsd' },
                    PlatformArch: { ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64' },
                    PlatformNaclArch: { ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64' },
                    connect: () => {},
                    sendMessage: () => {}
                },
                loadTimes: () => {},
                csi: () => {},
                app: {}
            };

            // Mock languages & realistic plugins
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en', 'pl'],
                configurable: true
            });

            Object.defineProperty(navigator, 'plugins', {
                get: () => [
                    { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
                    { name: 'Chrome PDF Viewer', filename: 'mhjfbhegnghfalhiafhoolililmhaoao', description: 'Enables PDF viewing' }
                ],
                configurable: true
            });

            // Mock hardware concurrency
            Object.defineProperty(navigator, 'hardwareConcurrency', {
                get: () => 8,
                configurable: true
            });

            // Mock permissions query safely
            if (window.navigator.permissions && window.navigator.permissions.query) {
                const originalQuery = window.navigator.permissions.query;
                window.navigator.permissions.query = (parameters) => (
                    parameters && parameters.name === 'notifications' ?
                        Promise.resolve({ state: Notification.permission }) :
                        originalQuery(parameters)
                );
            }
        });
    }

    /**
     * Simulates natural human reading scroll with acceleration and deceleration
     * @param {import('playwright').Page} page
     * @param {number} scrollCount - How many scroll pulses to perform
     */
    async naturalScroll(page, scrollCount = 3) {
        if (!page) return;
        for (let i = 0; i < scrollCount; i++) {
            const distance = Math.floor(Math.random() * 300) + 120;
            const steps = Math.floor(Math.random() * 6) + 4;
            
            for (let s = 0; s < steps; s++) {
                try {
                    await page.mouse.wheel(0, distance / steps);
                    await this.randomDelay(25, 60);
                } catch (e) {
                    break;
                }
            }
            
            const readingPause = Math.floor(Math.random() * 2000) + 1200;
            await new Promise(resolve => setTimeout(resolve, readingPause));
        }
    }

    /**
     * Moves mouse along a realistic curved Quadratic Bézier path
     * @param {import('playwright').Page} page
     * @param {number} targetX
     * @param {number} targetY
     */
    async bezierMouseMove(page, targetX, targetY) {
        if (!page) return;
        const startX = Math.floor(Math.random() * 200) + 100;
        const startY = Math.floor(Math.random() * 200) + 100;
        
        const controlX = (startX + targetX) / 2 + (Math.random() * 100 - 50);
        const controlY = (startY + targetY) / 2 + (Math.random() * 100 - 50);

        const steps = 16;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const curX = Math.pow(1 - t, 2) * startX + 2 * (1 - t) * t * controlX + Math.pow(t, 2) * targetX;
            const curY = Math.pow(1 - t, 2) * startY + 2 * (1 - t) * t * controlY + Math.pow(t, 2) * targetY;
            
            try {
                await page.mouse.move(curX, curY);
                await this.randomDelay(8, 20);
            } catch (err) {
                // Page may have closed or navigated
                break;
            }
        }
    }

    /**
     * Smoothly moves mouse to an element and clicks it with natural human hover and press duration
     * @param {import('playwright').Page} page
     * @param {string|import('playwright').Locator|import('playwright').ElementHandle} target
     */
    async humanClick(page, target) {
        if (!page || !target) {
            throw new Error('[HumanEmulator] humanClick requires both page and target arguments.');
        }

        let locator = null;
        if (typeof target === 'string') {
            locator = page.locator(target).first();
        } else {
            locator = target;
        }

        const box = await locator.boundingBox().catch(() => null);
        if (box) {
            // Target slightly randomized point inside the element
            const offsetX = box.width * (0.3 + Math.random() * 0.4);
            const offsetY = box.height * (0.3 + Math.random() * 0.4);
            const destX = box.x + offsetX;
            const destY = box.y + offsetY;

            await this.bezierMouseMove(page, destX, destY);
            await this.randomDelay(150, 400);
            await page.mouse.down();
            await this.randomDelay(60, 140);
            await page.mouse.up();
        } else {
            // Fallback click if element has no bounding box (e.g. SVG or off-screen)
            await locator.click().catch(err => {
                console.warn(`[HumanEmulator] Fallback click notice on ${locator}: ${err.message}`);
            });
        }
        await this.randomDelay(300, 700);
    }

    /**
     * Types text with human-like rhythm, variable cadence, and occasional typo corrections
     * @param {import('playwright').Page} page
     * @param {string|import('playwright').Locator} selectorOrLocator
     * @param {string} text
     */
    async humanType(page, selectorOrLocator, text) {
        if (!page || !selectorOrLocator) return;
        if (!text || typeof text !== 'string') return;

        const locator = typeof selectorOrLocator === 'string'
            ? page.locator(selectorOrLocator).first()
            : selectorOrLocator;

        await this.humanClick(page, locator);
        await this.randomDelay(300, 700);

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            
            // 1.5% chance of simulated human typo and backspace correction
            if (Math.random() < 0.015 && /[a-zA-Z]/.test(char)) {
                const wrongChar = String.fromCharCode(char.charCodeAt(0) + (Math.random() > 0.5 ? 1 : -1));
                try {
                    await page.keyboard.type(wrongChar);
                    await this.randomDelay(110, 260);
                    await page.keyboard.press('Backspace');
                    await this.randomDelay(140, 360);
                } catch (e) {}
            }

            try {
                await page.keyboard.type(char);
            } catch (err) {
                console.error(`[HumanEmulator] Failed typing char at ${i}:`, err.message);
                break;
            }
            
            // Realistic cadence pauses
            if (['.', '!', '?'].includes(char)) {
                await this.randomDelay(300, 650);
            } else if ([',', ';', ':', '—', '-'].includes(char)) {
                await this.randomDelay(180, 400);
            } else if (char === ' ') {
                await this.randomDelay(70, 170);
            } else if (char === '\n') {
                await this.randomDelay(350, 700);
            } else {
                await this.randomDelay(40, 110);
            }
        }
        await this.randomDelay(400, 1000);
    }

    /**
     * Simulates natural human reading/gazing pause before committing an action
     */
    async simulateHesitation(minMs = 1200, maxMs = 3000) {
        await this.randomDelay(minMs, maxMs);
    }
}

module.exports = new HumanEmulator();

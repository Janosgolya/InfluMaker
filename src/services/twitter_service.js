const fs = require('fs');
const path = require('path');
const { uploadTwitterPost } = require('./twitter_browser_uploader');

class TwitterService {
    constructor() {
        this.sessionPath = path.join(__dirname, '../../config/twitter_session.json');
        this.fanvueUrl = 'https://fanvue.com/bettyryal';
    }

    /**
     * Checks if Twitter session exists and has cookies
     */
    isConfigured() {
        if (!fs.existsSync(this.sessionPath)) return false;
        try {
            const data = fs.readFileSync(this.sessionPath, 'utf8');
            const parsed = JSON.parse(data);
            return Array.isArray(parsed.cookies) && parsed.cookies.length > 0;
        } catch {
            return false;
        }
    }

    /**
     * Extracts Twitter copy from Eve's story file or formats fallback under 280 chars
     * @param {string} storyPath - Path to .story.txt
     */
    parseTwitterStory(storyPath) {
        let tweetText = `Before the London manor awakens, I write my quiet confessions by candlelight... 🕯️\n\nFull diary & uncensored entries: ${this.fanvueUrl}\n\n#BettyRyal #18thCentury #PeriodDrama #AIArt`;

        if (storyPath && fs.existsSync(storyPath)) {
            const raw = fs.readFileSync(storyPath, 'utf8');

            // Check SECTION 3: TWITTER / X FORMAT
            if (raw.includes('TWITTER') || raw.includes('SECTION 3')) {
                const twSection = raw.split(/TWITTER|SECTION 3/i)[1] || '';
                const lines = twSection.split('\n').map(l => l.trim()).filter(Boolean);

                const textLines = lines.filter(l => !l.startsWith('###') && !l.toLowerCase().includes('section'));
                if (textLines.length > 0) {
                    const joined = textLines.join('\n');
                    if (joined.length > 10) {
                        tweetText = joined;
                    }
                }
            } else {
                const cleaned = raw.replace(/###.+/g, '').replace(/\[.+?\]/g, '').trim();
                const snippet = cleaned.substring(0, 160).trim();
                tweetText = `${snippet}...\n\nRead more in my bio: ${this.fanvueUrl}\n\n#BettyRyal #18thCentury #PeriodDrama`;
            }
        }

        // Guarantee Fanvue link is present
        if (!tweetText.includes('fanvue.com/bettyryal')) {
            tweetText += `\n\n${this.fanvueUrl}`;
        }

        // Ensure within 280 character limit
        if (tweetText.length > 275) {
            tweetText = tweetText.substring(0, 240).trim() + `...\n\n${this.fanvueUrl} #BettyRyal`;
        }

        return { tweetText };
    }

    /**
     * Publishes a Tweet with Image to X
     * @param {string} imagePath - Path to image file
     * @param {string} [storyPath] - Path to .story.txt file
     * @param {Object} [overrides] - Custom tweetText override
     */
    async publishTweet(imagePath, storyPath = null, overrides = {}) {
        if (!this.isConfigured()) {
            throw new Error(`Twitter session not configured. Please run 'login_twitter.bat' first!`);
        }

        const parsed = this.parseTwitterStory(storyPath);
        const tweetText = overrides.tweetText || parsed.tweetText;

        return await uploadTwitterPost({
            imagePath,
            tweetText,
            headless: true
        });
    }
}

module.exports = new TwitterService();

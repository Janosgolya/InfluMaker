const fs = require('fs');
const path = require('path');
const { uploadTwitterPost } = require('./twitter_browser_uploader');
const storyParser = require('./story_parser');

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
     * Extracts Twitter copy from Eve's story file via StoryParser
     * @param {string} storyPath - Path to .story.txt
     */
    parseTwitterStory(storyPath) {
        if (storyPath && fs.existsSync(storyPath)) {
            const parsed = storyParser.parse(storyPath);
            return { tweetText: parsed.twitter.fullTweet };
        }

        const fallback = `Before the London manor stirs, I write my quiet confessions by tallow candlelight...\n\n${this.fanvueUrl}\n\n#BettyRyal #18thCentury #PeriodDrama`;
        return { tweetText: fallback };
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

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
     * Retrieves recent published tweet texts from published_log.json for strict deduplication
     */
    getRecentTweets(limit = 40) {
        const logPath = path.join(__dirname, '../../config/published_log.json');
        if (!fs.existsSync(logPath)) return [];
        try {
            const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));
            return data
                .filter(e => e.platform === 'Twitter' && e.tweetText)
                .slice(-limit)
                .map(e => e.tweetText.split('\n')[0].trim().toLowerCase());
        } catch {
            return [];
        }
    }

    /**
     * Extracts Twitter copy from Eve's story file via StoryParser with visual grounding and deduplication
     * @param {string} storyPath - Path to .story.txt
     * @param {string} [imagePath] - Path to image file for visual inference fallback
     */
    parseTwitterStory(storyPath, imagePath = null) {
        let candidateBody = '';
        let sceneSummary = '';
        let theme = 'MORNING';

        if (storyPath && fs.existsSync(storyPath)) {
            const parsed = storyParser.parse(storyPath);
            candidateBody = parsed.twitter.body;
            sceneSummary = parsed.metadata.sceneSummary || '';
            theme = parsed.metadata.theme || 'MORNING';
        } else if (imagePath) {
            const baseName = path.basename(imagePath, path.extname(imagePath)).replace(/_/g, ' ');
            sceneSummary = `Betty Ryal in an 18th-century scene: ${baseName}`;
            candidateBody = storyParser.generateContextualTweet(sceneSummary, theme, '');
        } else {
            sceneSummary = 'Betty Ryal in the quiet London manor by candlelight';
            candidateBody = storyParser.generateContextualTweet(sceneSummary, theme, '');
        }

        // Deduplication against recent Twitter post history
        const recentTweets = this.getRecentTweets(40);
        let salt = 1;
        while (recentTweets.includes(candidateBody.toLowerCase()) && salt <= 10) {
            console.log(`[TwitterService] 🔄 Tweet text repeated in recent log! Generating alternative variant (salt ${salt})...`);
            candidateBody = storyParser.generateContextualTweet(sceneSummary, theme, '', salt);
            salt++;
        }

        const maxBodyLen = 205;
        if (candidateBody.length > maxBodyLen) {
            candidateBody = candidateBody.substring(0, maxBodyLen - 3).trim() + '...';
        }

        const fullTweet = `${candidateBody}\n\n${this.fanvueUrl}\n\n#BettyRyal #18thCentury #PeriodDrama`;

        return {
            body: candidateBody,
            tweetText: fullTweet
        };
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

        const parsed = this.parseTwitterStory(storyPath, imagePath);
        const tweetText = overrides.tweetText || parsed.tweetText;

        return await uploadTwitterPost({
            imagePath,
            tweetText,
            headless: true
        });
    }
}

module.exports = new TwitterService();

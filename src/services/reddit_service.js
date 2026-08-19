const fs = require('fs');
const path = require('path');
const { uploadRedditPost } = require('./reddit_browser_uploader');
const storyParser = require('./story_parser');

class RedditService {
    constructor() {
        this.sessionPath = path.join(__dirname, '../../config/reddit_session.json');
        this.defaultSubreddit = 'aiArt';
    }

    /**
     * Checks if Reddit session exists and is non-empty
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
     * Extracts Reddit specific copy from Eve's .story.txt file via StoryParser
     * @param {string} storyPath - Path to .story.txt
     */
    parseRedditStory(storyPath) {
        if (storyPath && fs.existsSync(storyPath)) {
            const parsed = storyParser.parse(storyPath);
            let subreddit = this.defaultSubreddit;
            const subMatch = parsed.reddit.subreddits.match(/r\/([A-Za-z0-9_]+)/);
            if (subMatch) subreddit = subMatch[1];

            return {
                title: parsed.reddit.title,
                subreddit: subreddit,
                firstComment: parsed.reddit.comment,
                isNsfw: false
            };
        }

        return {
            title: "Betty's quiet hour in the London mansion by candlelight [OC] [AI]",
            subreddit: this.defaultSubreddit,
            firstComment: `Before the house awakens, I write my private diary by candlelight... 🕯️\n\nDiscover the full uncensored entries in my bio link: https://fanvue.com/bettyryal`,
            isNsfw: false
        };
    }

    /**
     * Publishes an image post to Reddit
     * @param {string} imagePath - Path to image file
     * @param {string} [storyPath] - Path to .story.txt file
     * @param {Object} [overrides] - Custom overrides for title, subreddit, comment
     */
    async publishPost(imagePath, storyPath = null, overrides = {}) {
        if (!this.isConfigured()) {
            throw new Error(`Reddit session not configured. Please run 'login_reddit.bat' first!`);
        }

        const parsed = this.parseRedditStory(storyPath);
        const title = overrides.title || parsed.title;
        const subreddit = overrides.subreddit || parsed.subreddit;
        const firstComment = overrides.firstComment || parsed.firstComment;
        const isNsfw = overrides.isNsfw !== undefined ? overrides.isNsfw : parsed.isNsfw;

        return await uploadRedditPost({
            imagePath,
            title,
            subreddit,
            firstComment,
            isNsfw,
            headless: true
        });
    }
}

module.exports = new RedditService();

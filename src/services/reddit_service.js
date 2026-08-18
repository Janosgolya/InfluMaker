const fs = require('fs');
const path = require('path');
const { uploadRedditPost } = require('./reddit_browser_uploader');

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
     * Extracts Reddit specific copy from Eve's .story.txt file or generates fallback
     * @param {string} storyPath - Path to .story.txt
     */
    parseRedditStory(storyPath) {
        let title = "Betty's quiet hour in the London mansion by candlelight [OC] [AI]";
        let subreddit = this.defaultSubreddit;
        let firstComment = `Before the house awakens, I write my private diary by candlelight... 🕯️\n\nDiscover the full uncensored entries in my bio link: https://fanvue.com/bettyryal`;
        let isNsfw = false;

        if (storyPath && fs.existsSync(storyPath)) {
            const raw = fs.readFileSync(storyPath, 'utf8');

            // Check for SECTION 5: REDDIT FORMAT
            if (raw.includes('REDDIT FORMAT') || raw.includes('SECTION 5')) {
                const redditSection = raw.split(/REDDIT FORMAT|SECTION 5/i)[1] || '';
                const lines = redditSection.split('\n').map(l => l.trim()).filter(Boolean);

                const titleLine = lines.find(l => l.toLowerCase().startsWith('post title:') || l.toLowerCase().startsWith('title:'));
                if (titleLine) title = titleLine.replace(/^(post\s+)?title:\s*/i, '').replace(/[#*]/g, '').trim();

                const subLine = lines.find(l => l.toLowerCase().startsWith('target subreddits:') || l.toLowerCase().startsWith('subreddit:'));
                if (subLine) {
                    const match = subLine.match(/r\/([A-Za-z0-9_]+)/);
                    if (match) subreddit = match[1];
                }

                const commentLine = lines.find(l => l.toLowerCase().startsWith('first comment:'));
                if (commentLine) {
                    firstComment = commentLine.replace(/^first comment:\s*/i, '').trim();
                }
            } else {
                // Fallback: use first sentence of story
                const cleaned = raw.replace(/###.+/g, '').replace(/\[.+?\]/g, '').trim();
                const firstLine = cleaned.split('\n')[0];
                if (firstLine) title = `${firstLine.substring(0, 100)} [OC] [AI]`;
            }

            if (raw.toLowerCase().includes('sensuality score: 8') || raw.toLowerCase().includes('sensuality score: 9') || raw.toLowerCase().includes('sensuality score: 10')) {
                isNsfw = true;
            }
        }

        return { title, subreddit, firstComment, isNsfw };
    }

    /**
     * Publishes a post to Reddit
     * @param {string} imagePath - Path to image file
     * @param {string} [storyPath] - Path to .story.txt file
     * @param {Object} [overrides] - Custom title/subreddit overrides
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
            firstComment,
            subreddit,
            isNsfw,
            headless: true
        });
    }
}

module.exports = new RedditService();

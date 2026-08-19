const fs = require('fs');
const path = require('path');
const { uploadPinterestPin } = require('./pinterest_browser_uploader');
const storyParser = require('./story_parser');

class PinterestService {
    constructor() {
        this.sessionPath = path.join(__dirname, '../../config/pinterest_session.json');
        this.defaultDestination = 'https://fanvue.com/bettyryal';
    }

    /**
     * Checks if Pinterest session exists and is non-empty
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
     * Extracts Pinterest specific copy from Eve's .story.txt file via StoryParser
     * @param {string} storyPath - Path to .story.txt
     */
    parsePinterestStory(storyPath) {
        if (storyPath && fs.existsSync(storyPath)) {
            const parsed = storyParser.parse(storyPath);
            return {
                title: parsed.pinterest.title,
                description: parsed.pinterest.description,
                boardName: parsed.pinterest.board,
                link: parsed.pinterest.link
            };
        }

        return {
            title: '18th Century London Maid Aesthetic | Betty Ryal 🕯️',
            description: 'Step into the quiet candlelight of an 18th-century London manor. Discover the private diary entries, fine art portraits, and hidden secrets of Betty Ryal.',
            boardName: '18th Century Aesthetic & Maid Secrets',
            link: this.defaultDestination
        };
    }

    /**
     * Publishes a Pin with Image to Pinterest
     * @param {string} imagePath - Path to image file
     * @param {string} [storyPath] - Path to .story.txt file
     * @param {Object} [overrides] - Custom overrides for title, description, board, link
     */
    async publishPin(imagePath, storyPath = null, overrides = {}) {
        if (!this.isConfigured()) {
            throw new Error(`Pinterest session not configured. Please run 'login_pinterest.bat' first!`);
        }

        const parsed = this.parsePinterestStory(storyPath);
        const title = overrides.title || parsed.title;
        const description = overrides.description || parsed.description;
        const boardName = overrides.board || parsed.boardName;
        const link = overrides.link || parsed.link;

        return await uploadPinterestPin({
            imagePath,
            title,
            description,
            boardName,
            link,
            headless: true
        });
    }
}

module.exports = new PinterestService();

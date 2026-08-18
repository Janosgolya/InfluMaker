const fs = require('fs');
const path = require('path');
const { uploadPinterestPin } = require('./pinterest_browser_uploader');

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
     * Extracts Pinterest specific copy from Eve's .story.txt file or generates fallback
     * @param {string} storyPath - Path to .story.txt
     */
    parsePinterestStory(storyPath) {
        let title = '18th Century London Maid Aesthetic | Betty Ryal 🕯️';
        let description = 'Step into the quiet candlelight of an 18th-century London manor. Discover the private diary entries, fine art portraits, and hidden secrets of Betty Ryal. #18thCentury #PeriodDrama #FineArtPhotography #HistoricalRomance #CorsetAesthetic';
        let boardName = '18th Century Aesthetic & Maid Secrets';
        let link = this.defaultDestination;

        if (storyPath && fs.existsSync(storyPath)) {
            const raw = fs.readFileSync(storyPath, 'utf8');
            
            // Check for SECTION 5: PINTEREST FORMAT
            if (raw.includes('PINTEREST FORMAT') || raw.includes('SECTION 5')) {
                const pinSection = raw.split(/PINTEREST FORMAT|SECTION 5/i)[1] || '';
                const lines = pinSection.split('\n').map(l => l.trim()).filter(Boolean);
                
                const titleLine = lines.find(l => l.toLowerCase().startsWith('title:')) || lines[0];
                if (titleLine) title = titleLine.replace(/^title:\s*/i, '').replace(/[#*]/g, '').trim();

                const descLine = lines.find(l => l.toLowerCase().startsWith('description:')) || lines.slice(1, 4).join(' ');
                if (descLine) description = descLine.replace(/^description:\s*/i, '').trim();
            } else {
                // Fallback: extract title and description from general story
                const cleaned = raw.replace(/###.+/g, '').replace(/\[.+?\]/g, '').trim();
                const paragraphs = cleaned.split('\n\n').filter(p => p.trim().length > 20);
                if (paragraphs.length > 0) {
                    description = paragraphs[0].substring(0, 450) + '\n\n#18thCentury #PeriodDrama #HistoricalRomance #FineArtPortrait';
                }
            }
        }

        return { title, description, boardName, link };
    }

    /**
     * Publishes a Pin using an image and story file
     * @param {string} imagePath - Path to image file
     * @param {string} [storyPath] - Path to .story.txt file
     * @param {Object} [overrides] - Custom title/description overrides
     */
    async publishPin(imagePath, storyPath = null, overrides = {}) {
        if (!this.isConfigured()) {
            throw new Error(`Pinterest session not configured. Please run 'node src/scripts/pinterest_browser_login.js'`);
        }

        const parsed = this.parsePinterestStory(storyPath);
        const title = overrides.title || parsed.title;
        const description = overrides.description || parsed.description;
        const link = overrides.link || parsed.link;
        const boardName = overrides.boardName || parsed.boardName;

        return await uploadPinterestPin({
            imagePath,
            title,
            description,
            link,
            boardName,
            headless: true
        });
    }
}

module.exports = new PinterestService();

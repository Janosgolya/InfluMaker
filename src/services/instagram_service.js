require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const InstagramBrowserUploader = require('./instagram_browser_uploader');

class InstagramService {
    constructor(options = {}) {
        this.characterDir = options.characterDir || path.join(__dirname, '../../BettyRyal_18centuryServant');
        this.instagramOutputDir = options.instagramOutputDir || path.join(this.characterDir, 'Instagram_Ready_Content');
        this.browserUploader = new InstagramBrowserUploader();
        this.loadProfileConfig();
        this.initDirectories();
    }

    initDirectories() {
        if (!fs.existsSync(this.instagramOutputDir)) {
            fs.mkdirSync(this.instagramOutputDir, { recursive: true });
        }
    }

    loadProfileConfig() {
        this.profile = {
            displayName: "Betty Ryal 🕯️",
            username: "secretsofthelondonmansion",
            bio: "A servant maid in London's cobblestone heart. 🕯️\nDiary excerpts written by warm candlelight & linen.\nDiscover my private uncensored chambers ⬇️",
            linkInBio: "https://www.fanvue.com/bettyryal",
            category: "Digital Creator / Period Romance",
            location: "London, United Kingdom",
            defaultHashtags: ["#18thCentury", "#PeriodRomance", "#FineArtPortrait", "#RembrandtLighting", "#HistoricalFiction", "#BettyRyal", "#LondonManor"]
        };
    }

    /**
     * Format image to optimal Instagram 4:5 vertical portrait (1080x1350)
     */
    async formatForInstagram(imagePath) {
        const ext = path.extname(imagePath);
        const baseName = path.basename(imagePath, ext);
        const outputPath = path.join(this.instagramOutputDir, `${baseName}_insta_4x5.jpg`);

        // Instagram 4:5 optimal resolution
        const width = 1080;
        const height = 1350;

        await sharp(imagePath)
            .resize(width, height, {
                fit: 'cover',
                position: 'centre'
            })
            .jpeg({ quality: 95 })
            .toFile(outputPath);

        console.log(`[Instagram] 📸 Formatted 4:5 portrait: ${path.basename(outputPath)}`);
        return outputPath;
    }

    /**
     * Parse Eve's sidecar .story.txt to extract Section 2: Instagram Format
     */
    parseInstagramStory(storyFilePath) {
        if (!fs.existsSync(storyFilePath)) {
            return null;
        }

        const content = fs.readFileSync(storyFilePath, 'utf8');
        const instaSectionMatch = content.match(/### SECTION 2:\s*📸 INSTAGRAM FORMAT[\s\S]*?(?=### SECTION 3:|$)/i);
        const instaText = instaSectionMatch ? instaSectionMatch[0] : content;

        const hookMatch = instaText.match(/#### HOOK LINE \/ FIRST SENTENCE:\s*\n([^\n]+)/i);
        const journalMatch = instaText.match(/#### SENSORY JOURNAL EXCERPT:\s*\n([\s\S]*?)(?=\n#### CALL TO ACTION|\n#### HASHTAGS|$)/i);
        const ctaMatch = instaText.match(/#### CALL TO ACTION & BIO REDIRECT:\s*\n([^\n]+)/i);
        const hashtagsMatch = instaText.match(/#### HASHTAGS:\s*\n([^\n]+)/i);

        const hook = hookMatch ? hookMatch[1].trim() : "The quiet of the laundry room before the manor stirs...";
        const journal = journalMatch ? journalMatch[1].trim() : "The cold London morning yields to the warmth of cedar tubs and rising steam. A quiet hour before the master rings the bell.";
        const cta = ctaMatch ? ctaMatch[1].trim() : "Read the rest of tonight's diary in my bio link 🕯️";
        const hashtags = hashtagsMatch ? hashtagsMatch[1].trim() : "#18thCentury #PeriodRomance #FineArtPortrait #RembrandtLighting #BettyRyal";

        const fullCaption = `${hook}\n\n${journal}\n\n${cta}\n.\n.\n.\n${hashtags}`;

        return {
            hook,
            journal,
            cta,
            hashtags,
            fullCaption
        };
    }

    /**
     * Prepare Instagram post bundle
     */
    async prepareInstagramPost(imagePath, storyFilePath) {
        const story = this.parseInstagramStory(storyFilePath);
        const formattedImage = await this.formatForInstagram(imagePath);

        const postPackage = {
            platform: 'Instagram',
            account: this.profile.username,
            formattedAssetPath: formattedImage,
            caption: story ? story.fullCaption : `The quiet morning before the manor stirs... 🕯️\n\nFull diary link in bio!\n${this.profile.defaultHashtags.join(' ')}`,
            location: this.profile.location,
            bioRedirectUrl: this.profile.linkInBio,
            status: 'READY_TO_PUBLISH',
            timestamp: new Date().toISOString()
        };

        const metaPath = formattedImage.replace('.jpg', '_metadata.json');
        fs.writeFileSync(metaPath, JSON.stringify(postPackage, null, 2), 'utf8');

        console.log(`\n======================================================`);
        console.log(`📸 INSTAGRAM: Post Package Ready`);
        console.log(`Account: @${this.profile.username}`);
        console.log(`Asset: ${path.basename(formattedImage)}`);
        console.log(`Bio Redirect: ${this.profile.linkInBio}`);
        console.log(`======================================================\n`);

        return postPackage;
    }

    /**
     * Complete Instagram Post Workflow (Formats 4:5 + Publishes via Web Session)
     */
    async publishPost(imagePath, storyFilePath, options = {}) {
        const postPackage = await this.prepareInstagramPost(imagePath, storyFilePath);

        if (this.browserUploader.isLoggedIn()) {
            console.log(`[Instagram] 🟢 Persistent Instagram Session detected! Publishing directly to Instagram feed...`);
            const uploadResult = await this.browserUploader.uploadAndPublish(
                postPackage.formattedAssetPath,
                postPackage.caption,
                options
            );
            return { ...postPackage, ...uploadResult, status: 'PUBLISHED' };
        } else {
            console.log(`[Instagram] ⚠️ No active session found. Asset formatted and saved in Instagram_Ready_Content.`);
            console.log(`[Instagram] 👉 Run 'node src/scripts/instagram_browser_login.js' once to enable 100% autonomous background posting.`);
            return postPackage;
        }
    }
}

module.exports = InstagramService;

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const InstagramBrowserUploader = require('./instagram_browser_uploader');
const storyParser = require('./story_parser');

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
     * Parse Eve's sidecar .story.txt to extract Section 2: Instagram Format via StoryParser
     */
    parseInstagramStory(storyFilePath) {
        if (!fs.existsSync(storyFilePath)) {
            return {
                hook: "The morning chill in the stone corridors... 🕯️",
                journal: "Before the manor stirs, I gather the linens by candlelight and listen to the quiet whispers of the house.",
                cta: "Discover the rest of my private diary via the link in my bio 🗝️",
                hashtags: this.profile.defaultHashtags.join(' '),
                fullCaption: `The morning chill in the stone corridors... 🕯️\n\nBefore the manor stirs, I gather the linens by candlelight and listen to the quiet whispers of the house.\n\nDiscover the rest of my private diary via the link in my bio 🗝️\n.\n.\n.\n${this.profile.defaultHashtags.join(' ')}`
            };
        }

        const parsed = storyParser.parse(storyFilePath);
        return {
            hook: parsed.instagram.hook,
            journal: parsed.instagram.excerpt,
            cta: parsed.instagram.cta,
            hashtags: parsed.instagram.hashtags.join(' '),
            fullCaption: parsed.instagram.fullCaption
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
            formattedImagePath: formattedImage,
            caption: story.fullCaption,
            hashtags: story.hashtags,
            aspectRatio: '4:5 (1080x1350)',
            linkInBio: this.profile.linkInBio,
            status: 'READY'
        };

        console.log(`\n======================================================`);
        console.log(`📸 INSTAGRAM READY POST PACKAGE`);
        console.log(`======================================================`);
        console.log(`Image: ${path.basename(formattedImage)}`);
        console.log(`Caption:\n${story.fullCaption}`);
        console.log(`======================================================\n`);

        return postPackage;
    }

    /**
     * Publish post directly to Instagram via Playwright Browser Uploader
     */
    async publishPost(imagePath, storyFilePath, options = {}) {
        console.log(`\n======================================================`);
        console.log(`📸 INSTAGRAM: Publishing Image Post to @${this.profile.username}`);
        console.log(`======================================================`);

        const formattedImage = await this.formatForInstagram(imagePath);
        const story = this.parseInstagramStory(storyFilePath);

        let uploadResult;
        if (this.browserUploader.isLoggedIn()) {
            console.log(`[Instagram] 🌐 Authenticated session found. Uploading via Playwright...`);
            uploadResult = await this.browserUploader.uploadAndPublish(formattedImage, story.fullCaption, options);
        } else {
            throw new Error('Brak aktywnej sesji Instagram w config/instagram_session.json. Uruchom LOGIN_INSTAGRAM.bat');
        }

        if (uploadResult && (uploadResult.error || uploadResult.status === 'ERROR')) {
            throw new Error(`Instagram upload failed: ${uploadResult.error || 'Nieznany błąd publikacji'}`);
        }

        return {
            status: 'PUBLISHED',
            platform: 'Instagram',
            formattedAssetPath: formattedImage,
            caption: story.fullCaption,
            result: uploadResult
        };
    }
}

module.exports = InstagramService;

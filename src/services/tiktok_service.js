require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const sharp = require('sharp');
const { URLSearchParams } = require('url');
const TikTokBrowserUploader = require('./tiktok_browser_uploader');

const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';

class TikTokService {
    constructor(options = {}) {
        this.accessToken = options.accessToken || process.env.TIKTOK_ACCESS_TOKEN || null;
        this.refreshToken = options.refreshToken || process.env.TIKTOK_REFRESH_TOKEN || null;
        this.clientKey = options.clientKey || process.env.TIKTOK_CLIENT_KEY || null;
        this.clientSecret = options.clientSecret || process.env.TIKTOK_CLIENT_SECRET || null;
        this.openId = options.openId || process.env.TIKTOK_OPEN_ID || null;
        this.characterDir = options.characterDir || path.join(__dirname, '../../BettyRyal_18centuryServant');
        this.tiktokOutputDir = options.tiktokOutputDir || path.join(this.characterDir, 'TikTok_Ready_Content');
        this.browserUploader = new TikTokBrowserUploader();
        this.loadProfileConfig();
        this.initDirectories();
    }

    initDirectories() {
        if (!fs.existsSync(this.tiktokOutputDir)) {
            fs.mkdirSync(this.tiktokOutputDir, { recursive: true });
        }
    }

    loadProfileConfig() {
        this.profile = {
            displayName: "Betty Ryal 🕯️",
            username: "bettyryal",
            bio: "From London's cold cobblestones to the manor's quiet halls. 🕯️\n18th-century maid writing her diary by candlelight.\nStep into my attic room ⬇️",
            linkInBio: "https://www.fanvue.com/bettyryal",
            category: "Historical Drama & Storytelling",
            defaultHashtags: ["#18thCentury", "#PeriodDrama", "#HistoricalRomance", "#BettyRyal", "#MaidLife", "#POV", "#Storytime"]
        };
    }

    /**
     * Refresh TikTok Access Token using refresh_token
     */
    async refreshTikTokToken() {
        if (!this.refreshToken || !this.clientKey || !this.clientSecret) {
            console.log(`[TikTok] ⚠️ Missing refresh credentials in .env`);
            return null;
        }

        console.log(`[TikTok] 🔄 Refreshing TikTok access token...`);

        const params = new URLSearchParams({
            client_key: this.clientKey,
            client_secret: this.clientSecret,
            grant_type: 'refresh_token',
            refresh_token: this.refreshToken
        });

        const postData = params.toString();

        return new Promise((resolve, reject) => {
            const req = https.request(`${TIKTOK_API_BASE}/oauth/token/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData),
                    'Cache-Control': 'no-cache'
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        if (json.data && json.data.access_token) {
                            this.accessToken = json.data.access_token;
                            if (json.data.refresh_token) this.refreshToken = json.data.refresh_token;

                            // Update .env
                            const envPath = path.join(__dirname, '../../.env');
                            let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
                            envContent = envContent.replace(/TIKTOK_ACCESS_TOKEN=.*/, `TIKTOK_ACCESS_TOKEN=${this.accessToken}`);
                            if (json.data.refresh_token) {
                                envContent = envContent.replace(/TIKTOK_REFRESH_TOKEN=.*/, `TIKTOK_REFRESH_TOKEN=${this.refreshToken}`);
                            }
                            fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');

                            console.log(`[TikTok] ✅ Token successfully refreshed!`);
                            resolve(this.accessToken);
                        } else {
                            reject(new Error(`Failed to refresh TikTok token: ${data}`));
                        }
                    } catch (e) {
                        reject(new Error(`Failed to parse TikTok refresh response: ${e.message}`));
                    }
                });
            });

            req.on('error', reject);
            req.write(postData);
            req.end();
        });
    }

    /**
     * Query TikTok Creator Publishing Info & Permissions
     */
    async getCreatorInfo() {
        if (!this.accessToken) {
            return {
                status: 'NOT_CONNECTED_API_KEY_REQUIRED',
                message: 'TIKTOK_ACCESS_TOKEN is not set in .env'
            };
        }

        return new Promise((resolve, reject) => {
            const req = https.request(`${TIKTOK_API_BASE}/post/publish/creator/info/query/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve(json.data || json);
                    } catch (e) {
                        resolve({ error: data });
                    }
                });
            });

            req.on('error', reject);
            req.write(JSON.stringify({}));
            req.end();
        });
    }

    /**
     * Format high-res horizontal/square image into TikTok 9:16 (1080x1920) vertical frame
     */
    async formatForTikTok(imagePath, hookText = "POV: You caught the inn's new maid...") {
        const ext = path.extname(imagePath);
        const baseName = path.basename(imagePath, ext);
        const outputPath = path.join(this.tiktokOutputDir, `${baseName}_tiktok_9x16.jpg`);

        const width = 1080;
        const height = 1920;

        // 1. Create blurred ambient background from original image
        const backgroundBuffer = await sharp(imagePath)
            .resize(width, height, { fit: 'cover' })
            .blur(30)
            .modulate({ brightness: 0.6 })
            .toBuffer();

        // 2. Resize foreground image to fit nicely within 9:16 canvas
        const foregroundWidth = 1040;
        const foregroundHeight = 1386; // 3:4 aspect ratio
        const foregroundBuffer = await sharp(imagePath)
            .resize(foregroundWidth, foregroundHeight, { fit: 'inside' })
            .toBuffer();

        // 3. Create SVG text overlay for the TikTok Hook
        const svgHook = Buffer.from(`
            <svg width="${width}" height="${height}">
                <style>
                    .hook-box { fill: rgba(0, 0, 0, 0.75); rx: 18; }
                    .hook-text { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 40px; font-weight: bold; fill: #ffffff; text-anchor: middle; }
                    .cta-text { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 28px; font-weight: bold; fill: #ffd700; text-anchor: middle; }
                </style>
                <rect x="50" y="150" width="980" height="150" class="hook-box" />
                <text x="540" y="240" class="hook-text">${hookText.substring(0, 52)}</text>
                
                <rect x="120" y="1670" width="840" height="100" class="hook-box" />
                <text x="540" y="1730" class="cta-text">💋 Full Uncensored Diary in Bio Link</text>
            </svg>
        `);

        // 4. Composite final TikTok frame
        await sharp(backgroundBuffer)
            .composite([
                { input: foregroundBuffer, gravity: 'centre' },
                { input: svgHook, top: 0, left: 0 }
            ])
            .jpeg({ quality: 95 })
            .toFile(outputPath);

        console.log(`[TikTok] 📱 Formatted 9:16 vertical TikTok asset: ${path.basename(outputPath)}`);
        return outputPath;
    }

    /**
     * Parse Eve's sidecar .story.txt to extract TikTok section
     */
    parseTikTokStory(storyFilePath) {
        if (!fs.existsSync(storyFilePath)) {
            return null;
        }

        const content = fs.readFileSync(storyFilePath, 'utf8');
        const tiktokSectionMatch = content.match(/### SECTION 1:\s*📱 TIKTOK FORMAT[\s\S]*?(?=### SECTION 2:|$)/i);
        const tiktokText = tiktokSectionMatch ? tiktokSectionMatch[0] : content;

        const hookMatch = tiktokText.match(/#### ON-SCREEN TEXT HOOK:\s*\n([^\n]+)/i);
        const spokenMatch = tiktokText.match(/#### SPOKEN NARRATIVE \/ VOICEOVER:\s*\n([\s\S]*?)(?=\n#### CAPTION|\n#### HASHTAGS|$)/i);
        const captionMatch = tiktokText.match(/#### CAPTION & BIO REDIRECT:\s*\n([^\n]+)/i);
        const hashtagsMatch = tiktokText.match(/#### HASHTAGS:\s*\n([^\n]+)/i);

        const hook = hookMatch ? hookMatch[1].trim() : "POV: You caught the inn's new maid in the quiet corridor...";
        const spokenVoiceover = spokenMatch ? spokenMatch[1].replace(/\(.*?\)/g, '').trim() : "I scurried through the dimly lit halls of the inn...";
        const caption = captionMatch ? captionMatch[1].trim() : "Caught in the quiet of the laundry room... #PeriodDrama #HistoricalRomance #BettyRyal #MaidLife #POV";
        const hashtags = hashtagsMatch ? hashtagsMatch[1].trim() : "#18thCentury #PeriodDrama #HistoricalRomance #BettyRyal #MaidLife #POV #Storytime";

        return {
            hook,
            spokenVoiceover,
            caption,
            hashtags,
            fullTikTokCaption: `${caption.replace(/"/g, '')}\n\n👉 Full secret diary link in bio!\n${hashtags}`
        };
    }

    /**
     * Prepare complete TikTok publish bundle (Formatted 9:16 Video/Image, Voiceover Script, Caption)
     */
    async prepareFirstTikTokPost(imagePath, storyFilePath) {
        const story = this.parseTikTokStory(storyFilePath);
        const hook = story ? story.hook : "POV: The inn's new maid by candlelight...";

        console.log(`\n======================================================`);
        console.log(`📱 TIKTOK: Preparing First Viral Post for @${this.profile.username}`);
        console.log(`Hook: "${hook}"`);
        console.log(`Bio Redirect: ${this.profile.linkInBio}`);
        console.log(`======================================================`);

        const formattedImage = await this.formatForTikTok(imagePath, hook);

        const postPackage = {
            platform: 'TikTok',
            account: this.profile.username,
            formattedAssetPath: formattedImage,
            hookText: hook,
            voiceoverScript: story ? story.spokenVoiceover : "",
            caption: story ? story.fullTikTokCaption : `${hook}\n\nLink in bio! #BettyRyal #PeriodDrama`,
            bioFunnelUrl: this.profile.linkInBio,
            status: 'READY_TO_PUBLISH',
            timestamp: new Date().toISOString()
        };

        // Save post metadata
        const metaPath = formattedImage.replace('.jpg', '_metadata.json');
        fs.writeFileSync(metaPath, JSON.stringify(postPackage, null, 2), 'utf8');

        console.log(`✅ [TikTok Success] 9:16 Post Package compiled!`);
        console.log(`📝 Caption:\n${postPackage.caption}`);
        console.log(`======================================================\n`);

        return postPackage;
    }

    /**
     * Publish photo post directly via TikTok Content Posting API v2
     */
    async publishDirectPhotoPost(imageUrls, title, description) {
        if (!this.accessToken) {
            console.log(`[TikTok] 🧪 SIMULATION / DRY-RUN (API tokens pending in .env)`);
            return {
                status: 'SIMULATED_SUCCESS',
                publish_id: `sim_tt_${Date.now()}`,
                title: title
            };
        }

        const payload = JSON.stringify({
            post_info: {
                title: title,
                description: description,
                privacy_level: 'PUBLIC_TO_EVERYONE',
                disable_comment: false,
                auto_add_music: true
            },
            source_info: {
                source: 'PULL_FROM_URL',
                photo_cover_index: 1,
                photo_images: imageUrls
            },
            post_mode: 'DIRECT_POST',
            media_type: 'PHOTO'
        });

        return new Promise((resolve, reject) => {
            const req = https.request(`${TIKTOK_API_BASE}/post/publish/content/init/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload)
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve(json.data || json);
                    } catch (e) {
                        reject(new Error(`Failed to parse TikTok publish response: ${data}`));
                    }
                });
            });

            req.on('error', reject);
            req.write(payload);
            req.end();
        });
    }

    /**
     * Convert 9:16 vertical graphic into high-quality 1080x1920 MP4 video for TikTok Studio
     */
    async convertImageToTikTokVideo(imagePath, durationSeconds = 6) {
        const ffmpegPath = require('ffmpeg-static');
        const { spawn } = require('child_process');
        const ext = path.extname(imagePath);
        const videoPath = imagePath.replace(ext, '.mp4');

        console.log(`[TikTok Video Engine] 🎬 Encoding 1080x1920 MP4 video (${durationSeconds}s)...`);

        return new Promise((resolve, reject) => {
            const args = [
                '-y',
                '-loop', '1',
                '-i', imagePath,
                '-c:v', 'libx264',
                '-t', durationSeconds.toString(),
                '-pix_fmt', 'yuv420p',
                '-vf', 'scale=1080:1920',
                '-r', '30',
                videoPath
            ];

            const proc = spawn(ffmpegPath, args);

            proc.on('close', (code) => {
                if (code === 0) {
                    console.log(`[TikTok Video Engine] ✅ 1080x1920 MP4 Video generated: ${path.basename(videoPath)}`);
                    resolve(videoPath);
                } else {
                    reject(new Error(`FFmpeg exited with code ${code}`));
                }
            });

            proc.on('error', reject);
        });
    }

    /**
     * Complete TikTok Post Workflow (Formats 9:16 + Generates MP4 Video + Publishes via Studio)
     */
    async publishPost(imagePath, storyFilePath, options = {}) {
        const postPackage = await this.prepareFirstTikTokPost(imagePath, storyFilePath);

        // Convert 9:16 vertical image into native 1080x1920 MP4 video
        const videoPath = await this.convertImageToTikTokVideo(postPackage.formattedAssetPath, 6);
        postPackage.videoPath = videoPath;

        if (this.browserUploader.isLoggedIn()) {
            console.log(`[TikTok] 🟢 Persistent TikTok Session detected! Publishing directly to TikTok Studio...`);
            const uploadResult = await this.browserUploader.uploadAndPublish(
                videoPath,
                postPackage.caption,
                options
            );
            return { ...postPackage, ...uploadResult, status: 'PUBLISHED' };
        } else {
            console.log(`[TikTok] ⚠️ No active browser session found. Video rendered and saved in TikTok_Ready_Content.`);
            console.log(`[TikTok] 👉 Run 'node src/scripts/tiktok_browser_login.js' once to enable 100% autonomous background posting.`);
            return postPackage;
        }
    }
}

module.exports = TikTokService;

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL, URLSearchParams } = require('url');

const FANVUE_MCP_ENDPOINT = 'https://mcp.fanvue.com/mcp';
const OLLAMA_HOST = 'localhost';
const OLLAMA_PORT = 11434;
const CHAT_MODEL = 'qwen2.5vl:latest';
const CLIENT_ID = process.env.FANVUE_CLIENT_ID || '7W956X2fWJuFSugXDBwOl80ZMnt3fNyBmg9pJ20MgOD';

class FanvueService {
    constructor(options = {}) {
        this.accessToken = options.accessToken || process.env.FANVUE_ACCESS_TOKEN || null;
        this.refreshToken = options.refreshToken || process.env.FANVUE_REFRESH_TOKEN || null;
        this.characterDir = options.characterDir || path.join(__dirname, '../../BettyRyal_18centuryServant');
        this.rpcId = 1;
        this.loadCharacterLore();
    }

    loadCharacterLore() {
        try {
            const descPath = path.join(this.characterDir, 'Betty Ryal_description.txt');
            this.lore = fs.existsSync(descPath) ? fs.readFileSync(descPath, 'utf8') : '';
        } catch (e) {
            this.lore = '';
        }
    }

    /**
     * Automatically refresh OAuth Access Token when expired
     */
    async refreshOAuthToken() {
        if (!this.refreshToken) {
            throw new Error('No FANVUE_REFRESH_TOKEN available for token refresh.');
        }

        console.log(`[Fanvue] 🔄 Refreshing OAuth token with auth server...`);

        const params = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: this.refreshToken,
            client_id: CLIENT_ID,
            resource: 'https://mcp.fanvue.com/mcp'
        });

        const postData = params.toString();

        return new Promise((resolve, reject) => {
            const req = https.request('https://auth.mcp.fanvue.com/oauth2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData)
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const tokens = JSON.parse(data);
                        if (tokens.access_token) {
                            this.accessToken = tokens.access_token;
                            if (tokens.refresh_token) {
                                this.refreshToken = tokens.refresh_token;
                            }

                            // Update .env file
                            const envPath = path.join(__dirname, '../../.env');
                            let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
                            envContent = envContent.replace(/FANVUE_ACCESS_TOKEN=.*/, `FANVUE_ACCESS_TOKEN=${this.accessToken}`);
                            if (tokens.refresh_token) {
                                envContent = envContent.replace(/FANVUE_REFRESH_TOKEN=.*/, `FANVUE_REFRESH_TOKEN=${this.refreshToken}`);
                            }
                            fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');

                            console.log(`[Fanvue] ✅ Access token successfully refreshed!`);
                            resolve(tokens.access_token);
                        } else {
                            reject(new Error(`Failed to refresh token: ${data}`));
                        }
                    } catch (err) {
                        reject(new Error(`Parse error during token refresh: ${err.message}`));
                    }
                });
            });

            req.on('error', reject);
            req.write(postData);
            req.end();
        });
    }

    /**
     * Call Fanvue MCP Server via JSON-RPC with automatic retry on 401 Unauthorized
     */
    async callMcpTool(toolName, args = {}) {
        if (!this.accessToken) {
            throw new Error('FANVUE_ACCESS_TOKEN is missing in .env');
        }

        const executeCall = () => {
            const body = JSON.stringify({
                jsonrpc: '2.0',
                id: this.rpcId++,
                method: 'tools/call',
                params: {
                    name: toolName,
                    arguments: args
                }
            });

            return new Promise((resolve, reject) => {
                const req = https.request(FANVUE_MCP_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json, text/event-stream'
                    }
                }, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', async () => {
                        if (res.statusCode === 401) {
                            // Token expired, trigger refresh and retry
                            try {
                                await this.refreshOAuthToken();
                                const retryRes = await executeCall();
                                resolve(retryRes);
                            } catch (refreshErr) {
                                reject(new Error(`Unauthorized and refresh failed: ${refreshErr.message}`));
                            }
                            return;
                        }

                        try {
                            const json = JSON.parse(data);
                            if (json.error) {
                                reject(new Error(`Fanvue MCP Error (${json.error.code}): ${json.error.message}`));
                                return;
                            }
                            if (json.result && json.result.content && json.result.content[0]) {
                                const textContent = json.result.content[0].text;
                                try {
                                    resolve(JSON.parse(textContent));
                                } catch (e) {
                                    resolve(textContent);
                                }
                            } else {
                                resolve(json.result);
                            }
                        } catch (err) {
                            reject(new Error(`Failed to parse MCP response: ${data}`));
                        }
                    });
                });

                req.on('error', reject);
                req.setTimeout(60000, () => {
                    req.destroy();
                    reject(new Error('Fanvue MCP request timed out'));
                });
                req.write(body);
                req.end();
            });
        };

        return executeCall();
    }

    /**
     * Upload raw image bytes to presigned uploadUrl and capture ETag
     */
    async uploadImageToUrl(uploadUrl, imagePath) {
        const imageBuffer = fs.readFileSync(imagePath);

        return new Promise((resolve, reject) => {
            const req = https.request(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'image/png',
                    'Content-Length': imageBuffer.length
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    const etag = res.headers['etag'] || res.headers['ETag'] || '';
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(etag.replace(/"/g, ''));
                    } else {
                        reject(new Error(`Image upload failed (HTTP ${res.statusCode}): ${data}`));
                    }
                });
            });

            req.on('error', reject);
            req.write(imageBuffer);
            req.end();
        });
    }

    /**
     * Get authenticated creator account profile
     */
    async getAccountProfile() {
        return this.callMcpTool('get-current-user', {});
    }

    /**
     * Upload a single image file and get upload metadata
     */
    async uploadSingleMedia(imagePath) {
        const uploadSlot = await this.callMcpTool('custom__start-image-upload', {});
        const etag = await this.uploadImageToUrl(uploadSlot.uploadUrl, imagePath);
        return {
            mediaUuid: uploadSlot.mediaUuid,
            uploadId: uploadSlot.uploadId,
            etag: etag,
            imageFile: path.basename(imagePath)
        };
    }

    /**
     * Calculate optimal Fanvue pricing and audience based on scene metadata
     */
    calculatePricing(meta = {}) {
        const sensuality = meta.sensualityScore || 5;
        const theme = (meta.theme || 'MIDDAY').toUpperCase();
        const isVideo = meta.isVideo || false;
        const isBundle = meta.isBundle || false;
        const bundleCount = meta.bundleCount || 1;

        if (isVideo) {
            return {
                priceCents: 3500, // $35.00
                priceFormatted: "$35.00",
                audience: "subscribers",
                type: "PPV_VIDEO",
                reason: "Weekly 4K High-Quality Video Highlight"
            };
        }

        if (isBundle) {
            const bundlePrice = 2499; // $24.99 for 10-photo VIP pack
            return {
                priceCents: bundlePrice,
                priceFormatted: `$${(bundlePrice / 100).toFixed(2)}`,
                audience: "subscribers",
                type: "VAULT_BUNDLE",
                reason: `Exclusive ${bundleCount}-Photo Vault Set ($24.99)`
            };
        }

        if (sensuality >= 8 || theme === 'NIGHT') {
            return {
                priceCents: 1499, // $14.99
                priceFormatted: "$14.99",
                audience: "subscribers",
                type: "LOCKED_PREMIUM_POST",
                reason: "High-Sensuality Night & Bathing Private Memory"
            };
        } else if (sensuality >= 6 || theme === 'PREP') {
            return {
                priceCents: 799, // $7.99
                priceFormatted: "$7.99",
                audience: "subscribers",
                type: "LOCKED_TEASER_POST",
                reason: "Evening Dressing & Seduction Prep"
            };
        } else {
            return {
                priceCents: 0,
                priceFormatted: "Included in Subscription",
                audience: "subscribers",
                type: "DAILY_FEED_POST",
                reason: "Standard Morning/Midday Maid Routine"
            };
        }
    }

    /**
     * Sanitize story text to enforce English-only, remove meta-commentary, tone labels, and bracket artifacts
     */
    sanitizeEnglishStoryText(text) {
        if (!text) return '';
        
        // 1. Remove all Chinese / East Asian characters
        let cleaned = text.replace(/[\u3000-\u303f\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\uff00-\uffef]/g, '');

        // 2. Strip standalone parenthetical lines and tone labels
        cleaned = cleaned.replace(/^\s*\([^)]{0,80}\)\s*$/gm, '');
        cleaned = cleaned.replace(/^\s*\([^)]{0,80}\)\s*[""']?/gm, '');
        cleaned = cleaned.replace(/^(Exclusive,?\s+seductive\s+tone\s*:\s*)/gim, '');
        cleaned = cleaned.replace(/^(Intimate\s+tone\s*:\s*)/gim, '');
        cleaned = cleaned.replace(/^(Whispered,?\s+intimate\s*:\s*)/gim, '');
        cleaned = cleaned.replace(/^(Seductive\s+tone\s*:\s*)/gim, '');

        // 3. Strip bracketed template placeholders like [Unlock the full 10-photo set...]
        cleaned = cleaned.replace(/\[Unlock the full[^\]]*\]/gi, '');
        cleaned = cleaned.replace(/\[Unlock[^\]]*\]/gi, '');

        // 4. Split into lines and deduplicate repeated content
        const lines = cleaned.split('\n');
        const seen = new Set();
        const resultLines = [];
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
                resultLines.push('');
                continue;
            }
            if (trimmed.length > 15) {
                const normalized = trimmed.toLowerCase();
                if (seen.has(normalized)) continue;
                seen.add(normalized);
            }
            resultLines.push(trimmed);
        }
        
        return resultLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    }

    /**
     * Parse Eve's sidecar .story.txt to extract Fanvue section
     */
    parseEveStory(storyFilePath, isPaidPost = false) {
        if (!fs.existsSync(storyFilePath)) {
            return null;
        }

        const content = fs.readFileSync(storyFilePath, 'utf8');
        const fanvueSectionMatch = content.match(/### SECTION 3:\s*💋 FANVUE FORMAT[\s\S]*?(?================================================================================|$)/i);
        const fanvueText = fanvueSectionMatch ? fanvueSectionMatch[0] : content;

        const confessionMatch = fanvueText.match(/#### SUBSCRIBER DIARY CONFESSION:\s*\n([\s\S]*?)(?=\n#### PAYWALL|\n#### TIP MENU|$)/i);
        const paywallMatch = fanvueText.match(/#### PAYWALL & PPV TEASER PITCH:\s*\n([\s\S]*?)(?=\n#### TIP MENU|\n#### HASHTAGS|$)/i);
        const tipMenuMatch = fanvueText.match(/#### TIP MENU & VIP CTA:\s*\n([\s\S]*?)(?=\n#### HASHTAGS|$)/i);
        const hashtagsMatch = fanvueText.match(/#### HASHTAGS:\s*\n([^\n]+)/i);

        let confession = this.sanitizeEnglishStoryText(confessionMatch ? confessionMatch[1].trim() : "Tonight in my attic room, I wrote down everything that happened behind closed doors...");
        let paywall = this.sanitizeEnglishStoryText(paywallMatch ? paywallMatch[1].trim() : "Unlock to see the full uncensored moment...");
        let tipMenu = this.sanitizeEnglishStoryText(tipMenuMatch ? tipMenuMatch[1].trim() : "Tip to support Betty's private diary.");
        const hashtags = hashtagsMatch ? hashtagsMatch[1].trim() : "#BettyRyal #Fanvue #HistoricalRomance";

        // Build elegant post text dynamically based on whether it is a paid PPV drop or standard subscription post
        let parts = [];
        if (confession) parts.push(confession);
        if (isPaidPost && paywall && paywall !== confession) parts.push(paywall);
        if (tipMenu) parts.push(tipMenu);
        if (hashtags) parts.push(hashtags);

        const fullPostText = this.sanitizeEnglishStoryText(parts.join('\n\n'));

        return {
            confession,
            paywall,
            tipMenu,
            hashtags,
            fullPostText
        };
    }

    /**
     * End-to-end publish image post to Fanvue via MCP custom flow
     */
    async publishImagePost(imagePath, storyFilePath, options = {}) {
        const sensualityMatch = storyFilePath.match(/_S(\d+)_/i);
        const sensuality = sensualityMatch ? parseInt(sensualityMatch[1], 10) : 5;
        const theme = options.theme || 'MIDDAY';

        const pricing = this.calculatePricing({
            sensualityScore: sensuality,
            theme: theme,
            isVideo: options.isVideo || false,
            isBundle: options.isBundle || false
        });

        const isPaid = pricing.priceCents > 0;
        const story = this.parseEveStory(storyFilePath, isPaid);
        if (!story) {
            throw new Error(`Missing Eve story file: ${storyFilePath}`);
        }

        console.log(`\n======================================================`);
        console.log(`🚀 FANVUE LIVE PUBLISHER: ${path.basename(imagePath)}`);
        console.log(`Audience: ${pricing.audience} | Price: ${pricing.priceFormatted} (${pricing.priceCents}¢)`);
        console.log(`Reason: ${pricing.reason}`);
        console.log(`======================================================`);

        // Step 1: Start image upload
        console.log(`[Fanvue] 📤 Requesting upload slot from Fanvue MCP...`);
        const uploadSlot = await this.callMcpTool('custom__start-image-upload', {});
        console.log(`[Fanvue] Slot granted: mediaUuid = ${uploadSlot.mediaUuid}`);

        // Step 2: Upload raw image bytes to S3 presigned URL
        console.log(`[Fanvue] 🚀 Uploading image bytes...`);
        const etag = await this.uploadImageToUrl(uploadSlot.uploadUrl, imagePath);
        console.log(`[Fanvue] Upload confirmed with ETag: ${etag}`);

        // Step 3: Create post on Fanvue
        console.log(`[Fanvue] 📝 Publishing post to Betty's Fanvue feed...`);
        const postPayload = {
            image: {
                mediaUuid: uploadSlot.mediaUuid,
                uploadId: uploadSlot.uploadId,
                etag: etag
            },
            text: story.fullPostText,
            audience: pricing.audience,
            price: pricing.priceCents > 0 ? pricing.priceCents : undefined,
            publishAt: options.publishAt || undefined
        };

        const postResult = await this.callMcpTool('custom__create-image-post', postPayload);
        console.log(`🎉 [Fanvue Success] Post published live! Post UUID: ${postResult.uuid || 'SUCCESS'}`);

        return {
            ...postResult,
            priceFormatted: pricing.priceFormatted,
            priceCents: pricing.priceCents,
            audience: pricing.audience,
            imageFile: path.basename(imagePath)
        };
    }

    /**
     * Build and publish a 10-Photo VIP Vault Bundle on Fanvue
     */
    async create10PhotoBundle(imagesList, options = {}) {
        const bundleTitle = options.title || "Laundry Room & Attic Secrets (10-Photo Exclusive Set)";
        const bundlePriceCents = options.priceCents || 2499; // $24.99
        const bundlePriceFormatted = `$${(bundlePriceCents / 100).toFixed(2)}`;

        console.log(`\n======================================================`);
        console.log(`📦 ANA: Preparing 10-Photo Vault Bundle`);
        console.log(`Title: ${bundleTitle}`);
        console.log(`Photos: ${imagesList.length} items`);
        console.log(`Price: ${bundlePriceFormatted} (${bundlePriceCents}¢)`);
        console.log(`======================================================`);

        // Step 1: Upload preview/cover image and establish paywall post
        const coverImage = imagesList[0];
        console.log(`[Bundle] 📸 Uploading cover/teaser image: ${path.basename(coverImage)}`);
        const coverMedia = await this.uploadSingleMedia(coverImage);

        // Step 2: Upload remaining 9 photos
        const uploadedMedia = [coverMedia];
        for (let i = 1; i < imagesList.length; i++) {
            const imgPath = imagesList[i];
            console.log(`[Bundle] 📤 [${i + 1}/${imagesList.length}] Uploading ${path.basename(imgPath)}...`);
            const mediaRes = await this.uploadSingleMedia(imgPath);
            uploadedMedia.push(mediaRes);
        }

        console.log(`\n✅ [Bundle] All ${uploadedMedia.length} photos successfully uploaded to Fanvue!`);

        // Step 3: Compose seductive bundle post text
        const bundlePostText = `✨ EXCLUSIVE 10-PHOTO VAULT SET: ${bundleTitle} ✨

"You saw me washing linen by candlelight in the quiet laundry room, but you haven't seen what happened when the candles were snuffed out and I retired to my attic bedchamber...

This private 10-photo set uncovers the complete, uncensored story of my secret hours in the great manor house. Every brush of linen, every unlaced corset, and every forbidden glance."

🔐 Unlock the full 10-Photo Set below for ${bundlePriceFormatted}.
Included: 10 Museum-Quality High-Res Photos.

#BettyRyal #FanvueExclusive #PeriodRomance #VaultDrop #HistoricalSeduction`;

        // Step 4: Create paywalled bundle post
        console.log(`[Bundle] 🚀 Publishing 10-Photo Paywall Post ($${(bundlePriceCents/100).toFixed(2)})...`);
        const postResult = await this.callMcpTool('custom__create-image-post', {
            image: {
                mediaUuid: coverMedia.mediaUuid,
                uploadId: coverMedia.uploadId,
                etag: coverMedia.etag
            },
            text: bundlePostText,
            audience: 'subscribers',
            price: bundlePriceCents
        });

        // Step 5: Attach all 10 media items to the post
        if (postResult && postResult.uuid) {
            console.log(`[Bundle] 🔗 Attaching all ${uploadedMedia.length} media items to post ${postResult.uuid}...`);
            await this.callMcpTool('update-post', {
                uuid: postResult.uuid,
                mediaUuids: uploadedMedia.map(m => m.mediaUuid)
            });
        }

        console.log(`🎉 [Bundle Published] Live on Fanvue with all 10 photos attached! Post UUID: ${postResult.uuid || 'SUCCESS'}`);

        return {
            title: bundleTitle,
            postUuid: postResult.uuid,
            priceCents: bundlePriceCents,
            priceFormatted: bundlePriceFormatted,
            photosCount: uploadedMedia.length,
            mediaUuids: uploadedMedia.map(m => m.mediaUuid),
            uploadedFiles: uploadedMedia.map(m => m.imageFile)
        };
    }

    /**
     * Generate 100% in-character AI response for incoming Fanvue DMs
     */
    async generateBettyChatReply(fanMessage, fanContext = {}) {
        const prompt = `You are Betty Ryal, a 20-year-old 18th-century orphan turned maid at a luxurious, high-class London inn / "house of joys".
You are chatting directly and privately with one of your admirers on Fanvue.

CHARACTER VOICE & PERSONALITY:
- Innocent yet curious and sensually awakening. Warm, slightly breathless, alluring, gentle, and intimate.
- 18th-century tone and vocabulary (uses period phrases naturally, mentions candles, hearth, linen, madam, chores, quiet corridors, her little attic room).
- Speaks as if the fan is her trusted confidant and secret companion.
- If the fan is polite, be sweet, affectionate, and grateful.
- If the fan flirts or asks for spicy/private pictures, tease gently, confess your desires, and mention that you kept some private sketches/portraits under your mattress in the attic room that you could share with him.

FAN'S MESSAGE:
"${fanMessage}"

FAN PROFILE / CONTEXT:
- Spending Tier: ${fanContext.tier || 'Supporter'}
- Name/Handle: ${fanContext.name || 'Dear Friend'}

Write a 2-4 sentence in-character reply as Betty. Do not break character or mention AI.`;

        const body = JSON.stringify({
            model: CHAT_MODEL,
            prompt: prompt,
            stream: false,
            options: {
                temperature: 0.8,
                num_predict: 250
            }
        });

        return new Promise((resolve, reject) => {
            const req = http.request({
                hostname: OLLAMA_HOST,
                port: OLLAMA_PORT,
                path: '/api/generate',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve(json.response ? json.response.trim() : "Good evening, my friend. It brings warmth to my heart to hear from you by the candle's glow.");
                    } catch (e) {
                        resolve("Good evening, my friend. It brings warmth to my heart to hear from you by the candle's glow.");
                    }
                });
            });

            req.on('error', () => resolve("Good evening, my friend. It brings warmth to my heart to hear from you by the candle's glow."));
            req.write(body);
            req.end();
        });
    }
}

module.exports = FanvueService;

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const sharp = require('sharp');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const OLLAMA_HOST = 'localhost';
const OLLAMA_PORT = 11434;
const DEFAULT_VISION_MODEL = 'qwen2.5vl:latest';
const DEFAULT_TEXT_MODEL = 'qwen2.5vl:latest';

class EveScreenwriterAgent {
    constructor(options = {}) {
        this.name = "Eve";
        this.role = "Screenwriter, Visual Storyteller & Cross-Platform Conversion Copywriter";
        this.characterDir = options.characterDir || path.join(__dirname, '../../BettyRyal_18centuryServant');
        this.visionModel = options.visionModel || DEFAULT_VISION_MODEL;
        this.textModel = options.textModel || DEFAULT_TEXT_MODEL;
        this.loadCharacterLore();
    }

    /**
     * Load character biography, visual guidelines, and world lore
     */
    loadCharacterLore() {
        try {
            const descPath = path.join(this.characterDir, 'Betty Ryal_description.txt');
            const visualPath = path.join(this.characterDir, 'Betty_visual_description.txt');

            this.lore = fs.existsSync(descPath) ? fs.readFileSync(descPath, 'utf8') : '';
            this.visualLore = fs.existsSync(visualPath) ? fs.readFileSync(visualPath, 'utf8') : '';

            this.characterName = "Betty Ryal";
            this.characterBio = `Name: Betty Ryal. A 20-year-old orphan from 18th-century London taken in as a maid at a high-class London mansion / inn for wealthy gentlemen and elegant ladies (1780s). She writes her private diary by tallow candlelight about her daily chores, linen changes, dressing ladies, secret glances, and her gradual sensual awakening.`;
        } catch (e) {
            console.warn(`[Eve] Warning loading character lore: ${e.message}`);
            this.lore = '';
            this.visualLore = '';
        }
    }

    /**
     * Call Google Gemini API as cloud fallback
     */
    async callGemini(prompt, imagePath = null) {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY environment variable is not set');
        }
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const parts = [prompt];
        if (imagePath && fs.existsSync(imagePath)) {
            const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
            const imgBuffer = fs.readFileSync(imagePath);
            parts.push({
                inlineData: {
                    data: imgBuffer.toString('base64'),
                    mimeType: mimeType
                }
            });
        }

        const result = await model.generateContent(parts);
        return result.response.text();
    }

    /**
     * Unified model caller with automatic local Ollama -> Gemini API fallback
     */
    async callModel(prompt, imagePath = null, model = this.textModel) {
        try {
            return await this.callOllama(prompt, imagePath, model);
        } catch (ollamaErr) {
            if (process.env.GEMINI_API_KEY) {
                console.log(`[Eve] ℹ️ Local Ollama unavailable (${ollamaErr.message}). Falling back to Gemini Flash API...`);
                return await this.callGemini(prompt, imagePath);
            }
            throw ollamaErr;
        }
    }

    /**
     * Call Ollama local model for vision or text generation
     */
    async callOllama(prompt, imagePath = null, model = this.textModel) {
        let bodyObj = {
            model: model,
            prompt: prompt,
            stream: false,
            options: {
                num_ctx: 8192,
                num_predict: 1800,
                temperature: 0.7
            }
        };

        if (imagePath && fs.existsSync(imagePath)) {
            try {
                const optimizedBuffer = await sharp(imagePath)
                    .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: 85 })
                    .toBuffer();
                bodyObj.images = [optimizedBuffer.toString('base64')];
            } catch (err) {
                const rawBuffer = fs.readFileSync(imagePath);
                bodyObj.images = [rawBuffer.toString('base64')];
            }
            bodyObj.model = this.visionModel;
        }

        const body = JSON.stringify(bodyObj);

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
                        if (json.error) {
                            reject(new Error(`Ollama error: ${json.error}`));
                            return;
                        }
                        resolve(json.response || '');
                    } catch (err) {
                        reject(new Error(`Ollama JSON parse error: ${err.message}`));
                    }
                });
            });

            req.on('error', (e) => reject(new Error(`Ollama connection error: ${e.message}`)));
            req.setTimeout(180000, () => {
                req.destroy();
                reject(new Error('Ollama request timed out after 180s'));
            });
            req.write(body);
            req.end();
        });
    }

    /**
     * Inspect image: extract visual features using existing Jones QC report or Ollama Vision
     */
    async inspectImage(imagePath) {
        const ext = path.extname(imagePath);
        const baseName = path.basename(imagePath, ext);
        const dir = path.dirname(imagePath);
        
        const jonesReportPath = path.join(dir, `${baseName}.txt`);
        let cachedVisuals = null;
        let sensuality = 'Sensual (SFW/NSFW balance)';
        let theme = 'Period Scene';

        if (fs.existsSync(jonesReportPath)) {
            try {
                const reportContent = fs.readFileSync(jonesReportPath, 'utf8');
                const descMatch = reportContent.match(/👁️ VISION DESCRIPTION[^\n]*\n([\s\S]*?)(?=\n\n⭐|\n⭐|\n\n🔥|\n🔥|$)/i);
                const sensMatch = reportContent.match(/SENSUALITY & SFW \/ NSFW RATING[^\n]*\nScore:\s*(\d+)/i) || reportContent.match(/SENSUALITY:\s*(\d+)/i);
                const themeMatch = reportContent.match(/Theme:\s*([^\n]+)/i) || reportContent.match(/THEME:\s*([^\n]+)/i);

                if (descMatch && descMatch[1].trim()) {
                    cachedVisuals = descMatch[1].trim();
                }
                if (sensMatch) {
                    sensuality = `Sensuality score: ${sensMatch[1]}/10`;
                }
                if (themeMatch) {
                    theme = themeMatch[1].trim();
                }
            } catch (e) {}
        }

        if (!cachedVisuals) {
            console.log(`[Eve] 👁️ Analyzing visual features for ${path.basename(imagePath)} via ${this.visionModel}...`);
            const visionPrompt = `Analyze this 18th-century scene of Betty Ryal:
1. Describe what is visible (the woman/maid, actions, dress, lighting, room, textures).
2. Rate sensuality (1-10).
3. Determine theme (MORNING, MIDDAY, PREP, NIGHT).

Format as:
DESCRIPTION: <vivid description>
SENSUALITY: <score 1-10>
THEME: <MORNING, MIDDAY, PREP, or NIGHT>`;

            try {
                const rawResp = await this.callModel(visionPrompt, imagePath, this.visionModel);
                const descMatch = rawResp.match(/DESCRIPTION:\s*([\s\S]*?)(?=\nSENSUALITY:|\nTHEME:|$)/i);
                const sensMatch = rawResp.match(/SENSUALITY:\s*(\d+)/i);
                const themeMatch = rawResp.match(/THEME:\s*([A-Za-z0-9_-]+)/i);

                if (descMatch && descMatch[1].trim()) cachedVisuals = descMatch[1].trim();
                else cachedVisuals = rawResp.trim();
                if (sensMatch) sensuality = `Sensuality score: ${sensMatch[1]}/10`;
                if (themeMatch) theme = themeMatch[1].trim().toUpperCase();
            } catch (err) {
                cachedVisuals = `An intimate 18th-century scene of Betty Ryal in the London manor.`;
            }
        }

        return {
            description: cachedVisuals.trim(),
            sensuality: sensuality,
            theme: theme
        };
    }

    /**
     * Generate complete 6-platform structured story file for an image
     */
    async generateStoryForImage(imagePath) {
        console.log(`\n======================================================`);
        console.log(`✍️ EVE: Writing multi-platform stories for: ${path.basename(imagePath)}`);
        console.log(`======================================================`);

        const visualInfo = await this.inspectImage(imagePath);
        console.log(`👁️ Visual Context: ${visualInfo.description.substring(0, 120)}...`);

        const generationPrompt = `You are Eve, master creative screenwriter for virtual influencer Betty Ryal.
Betty Ryal is an authentic 20-year-old 18th-century servant girl (1780s London manor).
She writes her private diary by tallow candlelight in her drafty attic chamber.

FIRST-PRINCIPLES WRITING RULES:
1. STRICT ENGLISH ONLY (18th-century vocabulary, breathless intimate rhythm).
2. FULL IMMERSION: Betty speaks/writes directly in first person ("I", "my tallow candle", "the cold linen", "in our London manor").
3. ZERO META-TEXT: DO NOT write quotation marks around lines, DO NOT write parenthetical tone instructions like "(Whispered)" or "(Seductive)", DO NOT write labels like "Note:".
4. SEPARATION OF CONCERNS: Keep paragraphs of prose 100% clean. NEVER insert hashtags inside narrative sentences.

CURRENT SCENE:
- Visual Scene: ${visualInfo.description}
- Sensuality: ${visualInfo.sensuality}
- Theme: ${visualInfo.theme}

WRITE THE STORY FILE EXACTLY IN THIS 6-SECTION STRUCTURE:

### SECTION 1: 📱 TIKTOK FORMAT
#### ON-SCREEN TEXT HOOK:
POV: You caught the manor's new maid in the quiet corridor...

#### SPOKEN NARRATIVE / VOICEOVER:
[A 20-30 second spoken diary excerpt in Betty's voice describing what happened in this scene, clean prose without hashtags]

#### CAPTION & BIO REDIRECT:
[Teasing 1-sentence caption directing viewers to read her full diary in her bio link]

#### HASHTAGS:
#18thCentury #PeriodDrama #HistoricalRomance #BettyRyal #MaidLife #POV

### SECTION 2: 📸 INSTAGRAM FORMAT
#### OPENING HOOK LINE:
[A striking, poetic first sentence that stops the scroll]

#### INTIMATE DIARY EXCERPT:
[2 evocative paragraphs from Betty's journal detailing sensations, textures, candlelight, and hidden feelings]

#### ENGAGEMENT QUESTION:
[A question prompting followers to reply, e.g. Would you have helped me lace my corset, or let it fall?]

#### FANVUE LINK-IN-BIO CTA:
[Sensual invitation directing to the private diary linked in bio]

#### HASHTAGS:
#FineArtPhotography #RembrandtLight #HistoricalDrama #Chiaroscuro #BettyRyal #CostumeDrama #SensualArt #VintageAesthetic #18thCentury

### SECTION 3: 💋 FANVUE FORMAT
#### SUBSCRIBER DIARY CONFESSION:
[An exclusive, intimate first-person confession for paying subscribers exploring her secret desires]

#### PAYWALL & PPV TEASER PITCH:
[High-converting teaser copy for locked photos/videos]

#### TIP MENU & VIP CTA:
[Warm invitation to tip or message in DMs]

### SECTION 4: 📌 PINTEREST FORMAT
#### TITLE:
[SEO title, e.g. 18th Century London Maid by Candlelight 🕯️ | Historical Romance Aesthetic]

#### DESCRIPTION:
[Evocative keyword-rich description under 400 characters inviting to explore Betty's diary]

#### BOARD:
18th Century Aesthetic & Maid Secrets

#### LINK:
https://fanvue.com/bettyryal

### SECTION 5: 🤖 REDDIT FORMAT
#### POST TITLE:
[Engaging title suitable for r/aiArt or r/HistoricalCostuming, e.g. Betty's quiet hour in the London manor [OC]]

#### TARGET SUBREDDITS:
r/aiArt, r/HistoricalCostuming, r/AIGirls

#### FIRST COMMENT:
[Friendly in-character comment asking about the art textures and pointing to bio for lore]

### SECTION 6: 🐦 X (TWITTER) FORMAT
#### TWEET TEXT:
[A punchy, breathless 1-2 sentence micro-confession strictly under 180 characters. Zero hashtags, zero links in this field]

#### CALLOUT LINK:
https://fanvue.com/bettyryal

#### HASHTAGS:
#BettyRyal #18thCentury #PeriodDrama`;

        console.log(`[Eve] 💭 Generating copy with ${this.textModel}...`);
        const rawStory = await this.callModel(generationPrompt, null, this.textModel);

        const ext = path.extname(imagePath);
        const baseName = path.basename(imagePath, ext);
        const dir = path.dirname(imagePath);
        const storyFilePath = path.join(dir, `${baseName}.story.txt`);

        const fileContent = `================================================================================
🎭 INFLUMAKER - EVE SCREENWRITER AGENT
================================================================================
Image File: ${path.basename(imagePath)}
Character: Betty Ryal (18th-Century London Inn Maid)
Theme: ${visualInfo.theme}
Sensuality: ${visualInfo.sensuality}
Generated At: ${new Date().toISOString()}

👁️ VISUAL SCENE SUMMARY:
${visualInfo.description}

================================================================================
${rawStory.trim()}
================================================================================
`;

        fs.writeFileSync(storyFilePath, fileContent, 'utf8');
        console.log(`✅ [Eve] Successfully saved structured story file: ${storyFilePath}`);
        return {
            imagePath,
            storyFilePath,
            content: fileContent
        };
    }

    /**
     * Process an entire folder of images
     */
    async processFolder(folderPath, options = {}) {
        const resolvedPath = path.resolve(folderPath);
        if (!fs.existsSync(resolvedPath)) {
            throw new Error(`Folder does not exist: ${resolvedPath}`);
        }

        const validExts = ['.jpg', '.jpeg', '.png', '.webp', '.jfif'];
        const entries = fs.readdirSync(resolvedPath, { withFileTypes: true });

        const imageFiles = entries
            .filter(e => e.isFile() && validExts.includes(path.extname(e.name).toLowerCase()))
            .map(e => path.join(resolvedPath, e.name));

        console.log(`\n======================================================`);
        console.log(`📁 EVE FOLDER PROCESSOR: ${resolvedPath}`);
        console.log(`Found ${imageFiles.length} images to inspect.`);
        console.log(`======================================================\n`);

        const limit = options.limit || imageFiles.length;
        const force = options.force || false;

        let processed = 0;
        let skipped = 0;
        let errors = 0;

        for (let i = 0; i < Math.min(imageFiles.length, limit); i++) {
            const imgPath = imageFiles[i];
            const ext = path.extname(imgPath);
            const baseName = path.basename(imgPath, ext);
            const storyPath = path.join(resolvedPath, `${baseName}.story.txt`);

            if (fs.existsSync(storyPath) && !force) {
                console.log(`⏩ [${i+1}/${imageFiles.length}] Skipping ${path.basename(imgPath)} (Story file already exists). Use --force to overwrite.`);
                skipped++;
                continue;
            }

            try {
                console.log(`\n▶️ [${i+1}/${imageFiles.length}] Processing ${path.basename(imgPath)}...`);
                await this.generateStoryForImage(imgPath);
                processed++;
            } catch (err) {
                console.error(`❌ [Eve] Error processing ${path.basename(imgPath)}: ${err.message}`);
                errors++;
            }
        }

        return { total: imageFiles.length, processed, skipped, errors };
    }
}

module.exports = EveScreenwriterAgent;

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const sharp = require('sharp');

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
            this.characterBio = `Name: Betty Ryal. An orphan from 18th-century London taken in as a maid at a high-class inn / "house of joys" for wealthy gentlemen and elegant ladies. She writes her private journal about her daily duties, cleaning, linen changes, assisting ladies, bathing, attending candlelit gatherings, and her gradual sensual awakening in an atmosphere of joy, flirting, and romance.`;
        } catch (e) {
            console.warn(`[Eve] Warning loading character lore: ${e.message}`);
            this.lore = '';
            this.visualLore = '';
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
                num_predict: 1500,
                temperature: 0.7
            }
        };

        if (imagePath && fs.existsSync(imagePath)) {
            try {
                // Resize image to max 1024 to prevent token overflow while preserving fine visual details
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
        
        // 1. Check if Jones QC report exists alongside image
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
            } catch (e) {
                // fallback to live vision
            }
        }

        // 2. If no cached visual description, run Ollama Vision
        if (!cachedVisuals) {
            console.log(`[Eve] 👁️ Analyzing visual features for ${path.basename(imagePath)} via ${this.visionModel}...`);
            const visionPrompt = `Analyze this 18th-century image in detail:
1. Describe what is visible (the woman/maid, her actions, what she is wearing/holding, the room, lighting, textures, any other persons).
2. Note the woman's physical appearance (hair color/style: blonde, dark, curly, auburn, red; attire: maid uniform vs noble lady dress).
3. Rate the sensuality (1-10) where 1 is innocent chore and 10 is explicit.
4. Suggest the scene theme: MORNING (attic, waking, morning light), MIDDAY (chores, laundry, cleaning, daytime), PREP (evening prep, dressing, corsets, golden hour), or NIGHT (candles, party, bathing, romance, relaxation).

Format your response as:
DESCRIPTION: <vivid 2-3 sentence description>
HAIR_APPEARANCE: <blonde, dark, curly, auburn, lady/mistress, or fellow maids>
SENSUALITY: <score 1-10>
THEME: <MORNING, MIDDAY, PREP, or NIGHT>`;

            try {
                const rawResp = await this.callOllama(visionPrompt, imagePath, this.visionModel);
                const descMatch = rawResp.match(/DESCRIPTION:\s*([\s\S]*?)(?=\nHAIR_APPEARANCE:|\nSENSUALITY:|\nTHEME:|$)/i);
                const hairMatch = rawResp.match(/HAIR_APPEARANCE:\s*([^\n]+)/i);
                const sensMatch = rawResp.match(/SENSUALITY:\s*(\d+)/i);
                const themeMatch = rawResp.match(/THEME:\s*([A-Za-z0-9_-]+)/i);

                if (descMatch && descMatch[1].trim()) {
                    cachedVisuals = descMatch[1].trim();
                } else if (rawResp.trim().length > 0) {
                    cachedVisuals = rawResp.trim();
                }

                if (hairMatch) {
                    cachedVisuals += ` [Appearance note: ${hairMatch[1].trim()}]`;
                }

                if (sensMatch) {
                    sensuality = `Sensuality score: ${sensMatch[1]}/10`;
                }
                if (themeMatch) {
                    theme = themeMatch[1].trim().toUpperCase();
                }
            } catch (err) {
                console.warn(`[Eve] Vision inspection warning: ${err.message}. Using filename cues.`);
                cachedVisuals = `An intimate 18th-century scene of Betty Ryal in the inn.`;
            }
        }

        return {
            description: cachedVisuals.trim(),
            sensuality: sensuality,
            theme: theme
        };
    }

    /**
     * Sanitize story text to enforce English-only and remove duplicates
     */
    sanitizeEnglishStory(text) {
        if (!text) return '';
        // 1. Remove all Chinese / East Asian characters, emojis, and non-Latin ideographs
        let cleaned = text.replace(/[\u3000-\u303f\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\uff00-\uffef]/g, '');
        
        // 2. Split into lines and deduplicate repeated content
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
     * Generate TikTok, Instagram, and Fanvue stories for an image
     */
    async generateStoryForImage(imagePath) {
        console.log(`\n======================================================`);
        console.log(`✍️ EVE: Writing multi-platform stories for: ${path.basename(imagePath)}`);
        console.log(`======================================================`);

        const visualInfo = await this.inspectImage(imagePath);
        console.log(`👁️ Visual Context: ${visualInfo.description.substring(0, 120)}...`);

        const generationPrompt = `You are Eve, the master creative screenwriter and conversion marketing strategist for virtual influencer Betty Ryal.

CRITICAL LANGUAGE & REPETITION RULES:
- STRICT ENGLISH ONLY: Write strictly in 18th-century period English. NEVER output Chinese, Asian characters, or any other language.
- NO REPETITIONS: Never repeat lines, phrases, or CTAs. Every paragraph must be unique and purposeful.

CHARACTER PROFILE & NARRATIVE PERSPECTIVE:
- Main Character / Narrator: Betty Ryal (a young blonde maid with fair hair).
- World & Setting: 18th-century London mansion / high-class inn. Betty writes her secret personal diary documenting life in the house.
- Persona Voice: First-person ("I", "my diary"). Warm, breathless, curious, alluring, and authentic to the 18th century.

APPEARANCE & MULTI-CHARACTER HANDLING RULE:
- IF the woman in the image is blonde / fair-haired: Betty is describing herself directly in the first person ("I was scrubbing the hearth...", "I loosened my stays...").
- IF the woman in the image has dark hair, curly hair, red/auburn hair, or wears noble silk gowns:
  Betty is STILL the first-person narrator, BUT she describes the woman in the picture as ANOTHER woman in the house from Betty's perspective:
  * Another maid / companion: (e.g. "My fellow maid Meg / Clara in the scullery...", "Helping the new girl with the heavy laundry tubs..."),
  * An aristocratic mistress / lady of the house: (e.g. "Lady Catherine / Lady Eleanor, whose stays I laced before the ball...", "The mistress of the manor in her silk bedchamber..."),
  * Multiple women: (e.g. "The ladies and maids whispering by the hearth...").
  Betty tells the story of what she witnessed, assisted with, or the secret desires shared between them.

CURRENT IMAGE SCENE:
- Visual Scene: ${visualInfo.description}
- Sensuality / Mood: ${visualInfo.sensuality}
- Time of Day / Theme: ${visualInfo.theme}

YOUR TASK:
Write a complete, high-converting story file for this exact image in STRICT ENGLISH ONLY, formatted in THREE distinct sections:

----------------------------------------------------
### SECTION 1: 📱 TIKTOK FORMAT (Top-of-Funnel Viral Hook & SFW Conversion)
- ON-SCREEN TEXT HOOK: A punchy 1-line curiosity gap / POV hook (e.g. "POV: You caught the inn's new maid in the quiet corridor...")
- SPOKEN NARRATIVE / VOICEOVER: A 20-30 second intimate, spoken diary monologue from Betty's voice describing what happened in this moment.
- CAPTION & BIO REDIRECT: A playful, teasing SFW caption in English only, ending with a compelling CTA directing viewers to the link in bio.
- HASHTAGS: 5-8 curated hashtags (#18thCentury #PeriodDrama #HistoricalRomance #BettyRyal #MaidLife #POV).

----------------------------------------------------
### SECTION 2: 📸 INSTAGRAM FORMAT (Middle-of-Funnel Aesthetic & Storytelling)
- OPENING HOOK LINE: An arresting first sentence that stops the scroll.
- INTIMATE DIARY EXCERPT: 2-3 poetic paragraphs in English from Betty's personal journal describing the scene, sensations, and secret emotions.
- ENGAGEMENT QUESTION: A question prompting followers to comment (e.g., "Would you have helped me lace my corset, or let it fall?").
- FANVUE LINK-IN-BIO CTA: A sensual, alluring invitation directing followers to her Fanvue link in bio.
- HASHTAGS: 10-15 aesthetic & niche hashtags (#FineArtPhotography #RembrandtLight #HistoricalDrama #Chiaroscuro #BettyRyal #CostumeDrama #SensualArt #VintageAesthetic).

----------------------------------------------------
### SECTION 3: 💋 FANVUE FORMAT (Bottom-of-Funnel Monetization & PPV Seduction)
- SUBSCRIBER DIARY CONFESSION: An exclusive, uncensored first-person confession for Betty's paying subscribers in English. Kinky, alluring, slightly erotic, exploring her true desires and secret encounters in the inn.
- PAYWALL & PPV TEASER PITCH: High-converting teaser copy in English designed to sell pay-per-view (PPV) locked photo sets or video drops.
- TIP MENU & VIP CTA: A warm, seductive callout in English inviting subscribers to tip or send private requests in DMs.

FORMAT YOUR RESPONSE EXACTLY WITH CLEAR HEADERS AND SECTIONS. ENGLISH ONLY. NO REPETITION. DO NOT ADD META COMMENTARY.`;

        console.log(`[Eve] 💭 Generating copy with ${this.textModel}...`);
        const rawStory = await this.callOllama(generationPrompt, null, this.textModel);

        // Sanitize: strip any Chinese / Asian characters and deduplicate lines
        const sanitizedStory = this.sanitizeEnglishStory(rawStory);

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
${sanitizedStory}
================================================================================
`;

        fs.writeFileSync(storyFilePath, fileContent, 'utf8');
        console.log(`✅ [Eve] Successfully saved story file: ${storyFilePath}`);
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

        console.log(`\n======================================================`);
        console.log(`🎉 EVE BATCH COMPLETE`);
        console.log(`Total: ${imageFiles.length} | Processed: ${processed} | Skipped: ${skipped} | Errors: ${errors}`);
        console.log(`======================================================\n`);

        return {
            total: imageFiles.length,
            processed,
            skipped,
            errors
        };
    }
}

// CLI Execution Support
if (require.main === module) {
    const args = process.argv.slice(2);
    let folder = null;
    let image = null;
    let limit = null;
    let force = false;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--folder' || args[i] === '-f') {
            folder = args[i + 1];
            i++;
        } else if (args[i] === '--image' || args[i] === '-i') {
            image = args[i + 1];
            i++;
        } else if (args[i] === '--limit' || args[i] === '-l') {
            limit = parseInt(args[i + 1], 10);
            i++;
        } else if (args[i] === '--force') {
            force = true;
        }
    }

    const eve = new EveScreenwriterAgent();

    (async () => {
        try {
            if (image) {
                await eve.generateStoryForImage(path.resolve(image));
            } else if (folder) {
                await eve.processFolder(path.resolve(folder), { limit, force });
            } else {
                // Default test folder
                const defaultFolder = path.join(__dirname, '../../BettyRyal_18centuryServant/Selected_Content/MORNING');
                console.log(`No arguments provided. Running Eve on default folder: ${defaultFolder} (Limit: 1)...`);
                await eve.processFolder(defaultFolder, { limit: 1, force });
            }
        } catch (e) {
            console.error(`[Eve Fatal Error]:`, e.message);
            process.exit(1);
        }
    })();
}

module.exports = EveScreenwriterAgent;

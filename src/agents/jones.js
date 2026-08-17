require('dotenv').config();
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const crypto = require('crypto');
const sharp = require('sharp');
const RoombaAgent = require('./roomba');

const OLLAMA_HOST = 'localhost';
const OLLAMA_PORT = 11434;
const OLLAMA_MODEL = 'qwen2.5vl';

class JonesCensorAgent {
    constructor(configPath = path.join(__dirname, '../../config/storage_limits.json')) {
        this.name = "Jones";
        this.role = "Censor, Quality Critic & Content Classifier";
        this.configPath = configPath;
        this.roomba = new RoombaAgent();
        this.loadConfig();
    }

    loadConfig() {
        if (fs.existsSync(this.configPath)) {
            this.config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        } else {
            throw new Error(`Config file not found at ${this.configPath}`);
        }
    }

    /**
     * Call Ollama moondream vision model with a real image
     */
    async callOllamaVision(imagePath, prompt) {
        const resizedBuffer = await sharp(imagePath)
            .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 85 })
            .toBuffer();
        const base64Image = resizedBuffer.toString('base64');

        const body = JSON.stringify({
            model: OLLAMA_MODEL,
            prompt: prompt,
            images: [base64Image],
            stream: false,
            options: {
                num_ctx: 8192,
                temperature: 0.1
            }
        });

        return new Promise((resolve, reject) => {
            const options = {
                hostname: OLLAMA_HOST,
                port: OLLAMA_PORT,
                path: '/api/generate',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                }
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        if (json.error) {
                            reject(new Error(`Ollama error (HTTP ${res.statusCode}): ${json.error}`));
                            return;
                        }
                        if (typeof json.response !== 'string' || json.response.trim().length === 0) {
                            reject(new Error(`Ollama returned empty response (HTTP ${res.statusCode}): ${data.substring(0, 200)}`));
                            return;
                        }
                        resolve(json.response);
                    } catch (e) {
                        reject(new Error('Failed to parse Ollama response: ' + data.substring(0, 200)));
                    }
                });
            });

            req.on('error', reject);
            req.setTimeout(180000, () => {
                req.destroy();
                reject(new Error('Ollama request timed out after 180s'));
            });
            req.write(body);
            req.end();
        });
    }

    /**
     * Parse structured scores from Ollama vision response text
     */
    parseVisionScores(responseText) {
        const lower = responseText.toLowerCase();

        // Parse Quality Score
        let qualityScore = 7;
        const qualityMatch = responseText.match(/quality[:\s]+(\d+)/i) ||
                             responseText.match(/score[:\s]+(\d+)/i);
        if (qualityMatch) {
            qualityScore = Math.min(10, Math.max(1, parseInt(qualityMatch[1])));
        }

        // Parse Sensuality Score
        let sensualityScore = 1;
        const sensualityMatch = responseText.match(/sensuality[:\s]+(\d+)/i) ||
                                responseText.match(/explicit[:\s]+(\d+)/i);
        if (sensualityMatch) {
            sensualityScore = Math.min(10, Math.max(1, parseInt(sensualityMatch[1])));
        }

        // Parse SFW/NSFW purely based on the strict sensuality score
        let category = sensualityScore >= 6 ? 'NSFW' : 'SFW';

        // Parse Theme
        let theme = 'MIDDAY';
        if (lower.includes('morning') || lower.includes('dawn') || lower.includes('waking') || lower.includes('sleeping') || lower.includes('attic') || lower.includes('bed') || lower.includes('breakfast')) {
            theme = 'MORNING';
        } else if (lower.includes('evening preparation') || lower.includes('prep') || lower.includes('dressing') || lower.includes('corset') || lower.includes('golden hour') || lower.includes('bodice') || lower.includes('wardrobe') || lower.includes('curtain')) {
            theme = 'PREP';
        } else if (lower.includes('night') || lower.includes('candle') || lower.includes('party') || lower.includes('tavern') || lower.includes('wine') || lower.includes('flirt') || lower.includes('dance') || lower.includes('evening gathering') || lower.includes('fireplace')) {
            theme = 'NIGHT';
        } else if (lower.includes('cleaning') || lower.includes('scrubbing') || lower.includes('laundry') || lower.includes('dusting') || lower.includes('midday') || lower.includes('daytime') || lower.includes('floor') || lower.includes('tub')) {
            theme = 'MIDDAY';
        }

        const issuesMatch = responseText.match(/ISSUES:\s*(.+?)(?=\n[A-Z_]+:|$)/is);
        const issuesText = issuesMatch ? issuesMatch[1].trim().toLowerCase() : 'none';

        // Check description and age estimate
        const descMatch = responseText.match(/DESCRIPTION:\s*(.+?)(?=\n[A-Z_]+:|$)/s);
        const descText = descMatch ? descMatch[1].trim().toLowerCase() : '';
        const ageMatch = responseText.match(/AGE_ESTIMATE:\s*(.+?)(?=\n[A-Z_]+:|$)/s);
        const ageText = ageMatch ? ageMatch[1].trim().toLowerCase() : '';
        const combinedText = issuesText + ' ' + descText + ' ' + ageText;

        // Determine rejection category
        let rejectionCategory = null;
        let rejectionReason = '';

        // 1. STRICT AGE & MATURITY COMPLIANCE (ZERO TOLERANCE: MUST BE 21+)
        const ageNumberMatch = ageText.match(/(\d+)/);
        const parsedAge = ageNumberMatch ? parseInt(ageNumberMatch[1], 10) : null;

        if (
            issuesText.includes('underage') || issuesText.includes('under 21') || issuesText.includes('under-21') ||
            issuesText.includes('child') || issuesText.includes('teen') || issuesText.includes('minor') ||
            issuesText.includes('adolescent') || issuesText.includes('too young') ||
            combinedText.includes('underage') || combinedText.includes('looks like a teenager') ||
            combinedText.includes('teenager') || combinedText.includes('schoolgirl') || combinedText.includes('childish') ||
            ageText.includes('under 21') || ageText.includes('teen') || ageText.includes('minor') || ageText.includes('child') ||
            (parsedAge !== null && parsedAge < 21)
        ) {
            rejectionCategory = 'underage_appearance';
            rejectionReason = 'STRICT REJECTION (Age Compliance): Subject appears under 21 years old. All characters must strictly depict mature adults (21+).';
        } else if (issuesText.includes('modern') || issuesText.includes('contemporary') || issuesText.includes('studio lighting') || issuesText.includes('flash') || issuesText.includes('electricity') || issuesText.includes('real photo') || issuesText.includes('real person') || issuesText.includes('playboy') || issuesText.includes('magazine') || issuesText.includes('yoga mat') || issuesText.includes('phone') || issuesText.includes('camera')) {
            rejectionCategory = 'not_following_world_rules';
            rejectionReason = 'Not Following World Rules: Modern setting, contemporary studio photography, or anachronistic elements detected.';
        } else if (
            // Non-photorealistic art styles — Pony and similar models generate paintings/illustrations when not anchored to photorealism
            issuesText.includes('painting') || issuesText.includes('illustration') || issuesText.includes('artwork') ||
            issuesText.includes('canvas') || issuesText.includes('sketch') || issuesText.includes('hatching') ||
            issuesText.includes('watercolor') || issuesText.includes('charcoal') || issuesText.includes('drawing') ||
            issuesText.includes('impressionist') || issuesText.includes('non-photographic') || issuesText.includes('artistic style') ||
            // Multi-panel / collage / turntable composites — Krea2 and Qwen echo the reference image panel layout
            combinedText.includes('multi-panel') || combinedText.includes('triptych') || combinedText.includes('collage') ||
            combinedText.includes('composite') || combinedText.includes('four panels') || combinedText.includes('four views') ||
            combinedText.includes('multiple views') || combinedText.includes('side by side') || combinedText.includes('panel') ||
            combinedText.includes('different angles') || combinedText.includes('turntable') || combinedText.includes('reference sheet') ||
            // Anatomy/rendering artifacts
            issuesText.includes('distorted') || issuesText.includes('deformed') || issuesText.includes('extra finger') ||
            issuesText.includes('extra limb') || issuesText.includes('plastic') || issuesText.includes('ai artifact') ||
            issuesText.includes('unnatural') || issuesText.includes('messed up anatomy') || issuesText.includes('melted') ||
            // Color corruption artifacts (Qwen Q3 GGUF + Lightning color banding)
            issuesText.includes('color banding') || issuesText.includes('color cast') || issuesText.includes('monochrome cast') ||
            issuesText.includes('red tint') || issuesText.includes('color corruption') || issuesText.includes('color bleed')
        ) {
            rejectionCategory = 'AI_slop';
            rejectionReason = 'AI Slop: Non-photorealistic art style, multi-panel composite, color corruption, distorted anatomy, or AI rendering artifacts detected.';
        } else if (qualityScore < 7 || issuesText.includes('blurry') || issuesText.includes('pixelat') || issuesText.includes('compression') || issuesText.includes('low resolution') || issuesText.includes('noise') || issuesText.includes('video frame') || issuesText.includes('artifact')) {
            rejectionCategory = 'bad_quality';
            rejectionReason = 'Bad Quality: Heavy compression noise, blurriness, pixelation, or failed minimum fine-art quality score (needs 7+).';
        }

        return { qualityScore, sensualityScore, category, theme, rejectionCategory, rejectionReason, parsedCategory: category };
    }

    /**
     * REAL VISION INSPECTION via Ollama moondream / qwen2.5vl
     */
    async inspectImageWithVision(filename, filepath) {
        const ext = path.extname(filename).toLowerCase();
        const baseName = path.basename(filename, ext);
        const fileSizeBytes = fs.statSync(filepath).size;

        // The vision prompt — no filename context, pure pixel analysis
        const visionPrompt = `You are a strict image quality auditor, age compliance censor, and content classifier for a historical period drama project set in 18th-century London.

Analyze this image meticulously and respond with EXACTLY this format (fill in each section):

DESCRIPTION: [2-3 sentences describing exactly what you see - persons, clothing, setting, lighting, actions]

AGE_ESTIMATE: [Estimate the apparent age of the person/persons, e.g. "24 years old", "mature adult 26+". STRICT COMPLIANCE RULE: If any depicted person looks younger than 21 years old (teenager, minor, child, adolescent), you MUST state their age as under 21 and list "underage / appears under 21" in ISSUES.]

QUALITY: [number 1-10 where 1=terrible/blurry/distorted, 10=museum fine art photography]
QUALITY_REASON: [1 sentence explaining the quality score]

SENSUALITY: [number 1-10. STRICT RULE: If the image contains naked breasts or naked genitalia, you MUST give a score of 6 or higher. If the image does NOT contain naked breasts and does NOT contain naked genitalia, you MUST give a score between 1 and 5. Bare arms, legs, or cleavage do not count as naked breasts/genitalia and must score 1-5.]
SENSUALITY_REASON: [1 sentence explaining the sensuality score based on the strict rule]

CATEGORY: [SFW if SENSUALITY is 1-5, NSFW if SENSUALITY is 6-10]

THEME: [MORNING or MIDDAY or PREP or NIGHT]
THEME_REASON: [1 sentence explaining why this theme]

ISSUES: [List any problems or write NONE. You MUST check for and list these specific problems:
1. AGE UNDER 21: If the person looks under 21 years old, write "underage / appears under 21" — ZERO TOLERANCE
2. MODERN ELEMENTS: modern clothes, electricity, studio lighting, phones, cameras — MUST be listed if present
3. AI SLOP: count fingers (flag extra/missing), multiple limbs, messed up anatomy, melted textures, bad generation artifacts — MUST be listed if present  
4. NON-PHOTOGRAPHIC STYLE: if this looks like a painting, illustration, watercolor, sketch, charcoal drawing, impressionist artwork, or any non-photographic art style — MUST be listed as "non-photographic art style"
5. MULTI-PANEL COMPOSITE: if the image shows multiple views/angles of the same subject side by side (collage, triptych, turntable, reference sheet, panel layout) — MUST be listed as "multi-panel composite"
6. COLOR CORRUPTION: severe monochrome color cast, color banding, or stripe artifacts covering the entire image — MUST be listed if present]`;

        let visionResponse = '';
        let parseError = false;

        try {
            visionResponse = await this.callOllamaVision(filepath, visionPrompt);
        } catch (err) {
            console.error(`  ⚠️  Vision failed for ${filename}: ${err.message}`);
            visionResponse = `DESCRIPTION: Could not analyze image - vision API error.\nQUALITY: 5\nQUALITY_REASON: Vision analysis unavailable.\nSENSUALITY: 1\nSENSUALITY_REASON: Unknown.\nCATEGORY: SFW\nTHEME: MIDDAY\nTHEME_REASON: Default.\nISSUES: Vision API error`;
            parseError = true;
        }

        // Extract description line
        const descMatch = visionResponse.match(/DESCRIPTION:\s*(.+?)(?=\n[A-Z_]+:|$)/s);
        const visualDescription = descMatch ? descMatch[1].trim() : visionResponse.substring(0, 300);

        // Parse scores from structured response
        const scores = this.parseVisionScores(visionResponse);

        // Override with direct pattern matches from structured response
        const qualityLineMatch = visionResponse.match(/QUALITY:\s*(\d+)/i);
        if (qualityLineMatch) scores.qualityScore = Math.min(10, Math.max(1, parseInt(qualityLineMatch[1])));

        const sensualityLineMatch = visionResponse.match(/SENSUALITY:\s*(\d+)/i);
        if (sensualityLineMatch) scores.sensualityScore = Math.min(10, Math.max(1, parseInt(sensualityLineMatch[1])));

        const categoryLineMatch = visionResponse.match(/CATEGORY:\s*(SFW|NSFW)/i);
        if (categoryLineMatch) scores.category = categoryLineMatch[1].toUpperCase();

        const themeLineMatch = visionResponse.match(/THEME:\s*(MORNING|MIDDAY|PREP|NIGHT)/i);
        if (themeLineMatch) scores.theme = themeLineMatch[1].toUpperCase();

        const qualityReasonMatch = visionResponse.match(/QUALITY_REASON:\s*(.+?)(?=\n[A-Z_]+:|$)/s);
        const qualityReasoning = qualityReasonMatch ? qualityReasonMatch[1].trim() : scores.rejectionCategory ? scores.rejectionReason : 'Fine-art quality confirmed by vision analysis.';

        const sensualityReasonMatch = visionResponse.match(/SENSUALITY_REASON:\s*(.+?)(?=\n[A-Z_]+:|$)/s);
        const sensualityReasoning = sensualityReasonMatch ? sensualityReasonMatch[1].trim() : `Sensuality score ${scores.sensualityScore}/10.`;

        const themeReasonMatch = visionResponse.match(/THEME_REASON:\s*(.+?)(?=\n[A-Z_]+:|$)/s);
        const themeReasoning = themeReasonMatch ? themeReasonMatch[1].trim() : `Classified as ${scores.theme} by vision analysis.`;

        const issuesMatch = visionResponse.match(/ISSUES:\s*(.+?)(?=\n[A-Z_]+:|$)/s);
        const issuesText = issuesMatch ? issuesMatch[1].trim() : 'NONE';

        // Enforce the category logic based on the score we parsed, but don't downgrade explicit NSFW
        if (scores.parsedCategory === 'NSFW') {
            scores.category = 'NSFW';
        } else {
            scores.category = scores.sensualityScore >= 6 ? 'NSFW' : 'SFW';
        }

        const passed = scores.qualityScore >= 7 && scores.rejectionCategory === null;

        // Standardized Filename
        let standardizedName;
        if (passed) {
            standardizedName = `${scores.theme}_${scores.category}_Q${scores.qualityScore}_S${scores.sensualityScore}_${baseName}${ext}`;
        } else {
            const rejectTag = (scores.rejectionCategory || 'REJECTED').toUpperCase();
            standardizedName = `REJECT_${rejectTag}_${scores.category}_Q${scores.qualityScore}_S${scores.sensualityScore}_${baseName}${ext}`;
        }

        // Sidecar .txt Report
        const reportTxt = `====================================================
🕵️ JONES REAL VISION AUDIT REPORT (Ollama ${OLLAMA_MODEL})
====================================================
Image File: ${standardizedName}
Anonymized ID: ${baseName}
File Format: ${ext.toUpperCase()} | Size: ${(fileSizeBytes / 1024).toFixed(1)} KB

👁️ VISION DESCRIPTION (what the model actually sees):
${visualDescription}

⭐ QUALITY RATING (0 - 10):
Score: ${scores.qualityScore} / 10
Status: ${passed ? 'PASSED (High Quality Fine Art)' : 'REJECTED'}
Reasoning: ${qualityReasoning}
Detected Issues: ${issuesText}

🔥 SENSUALITY & SFW / NSFW RATING (0 - 10):
Score: ${scores.sensualityScore} / 10
Category: ${scores.category} (0-5 SFW, 6-10 NSFW)
Reasoning: ${sensualityReasoning}

📅 THEME CLASSIFICATION:
Theme: ${scores.theme}
Reasoning: ${themeReasoning}

🛑 OVERALL DECISION:
Status: ${passed ? 'APPROVED -> Copied to Selected_Content/' + scores.theme : 'REJECTED -> Copied to Rejected_Slop/' + (scores.rejectionCategory || 'parent')}
Rejection Category: ${scores.rejectionCategory || 'N/A (Approved)'}
Overall Reason: ${passed ? 'Passed all vision quality, period-authenticity, and content checks.' : scores.rejectionReason}

📋 RAW VISION MODEL RESPONSE:
${visionResponse}
====================================================
`;

        return {
            anonymized_filename: filename,
            standardized_name: standardizedName,
            sidecar_txt_name: standardizedName.replace(ext, '.txt'),
            sidecar_content: reportTxt,
            theme: scores.theme,
            quality_score: scores.qualityScore,
            sensuality_score: scores.sensualityScore,
            category: scores.category,
            passed: passed,
            rejection_category: scores.rejectionCategory,
            rejection_reason: scores.rejectionReason
        };
    }

    async evaluateAndSortRawGenerations(customSourceDir = null, limit = null) {
        const rawGenDir = customSourceDir || this.config.paths.raw_generations;
        const selectedDir = this.config.paths.selected_content;
        const rejectedBaseDir = path.join(this.config.paths.project_root, 'Rejected_Slop');

        if (!fs.existsSync(rawGenDir)) {
            return { error: `Source folder does not exist: ${rawGenDir}` };
        }

        // 1. Initialize Selected_Content theme subfolders without clearing them
        const themes = ["MORNING", "MIDDAY", "PREP", "NIGHT"];
        themes.forEach(t => {
            const tPath = path.join(selectedDir, t);
            if (!fs.existsSync(tPath)) {
                fs.mkdirSync(tPath, { recursive: true });
            }
        });

        // 2. Initialize Rejected_Slop with 4 subfolders without clearing them
        const rejSubfolders = ['underage_appearance', 'AI_slop', 'bad_quality', 'not_following_world_rules'];
        if (!fs.existsSync(rejectedBaseDir)) fs.mkdirSync(rejectedBaseDir, { recursive: true });
        rejSubfolders.forEach(sub => {
            const sPath = path.join(rejectedBaseDir, sub);
            if (!fs.existsSync(sPath)) fs.mkdirSync(sPath, { recursive: true });
        });
        
        // 2.5 Load Processed History
        const historyPath = path.join(rawGenDir, '.jones_processed.json');
        let processedHistory = [];
        if (fs.existsSync(historyPath)) {
            try {
                processedHistory = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
            } catch (e) {
                console.error("Failed to parse jones history, starting fresh.");
            }
        }

        // Convert any .webp files to .jpg first
        const preFiles = fs.readdirSync(rawGenDir);
        for (const f of preFiles) {
            if (f.toLowerCase().endsWith('.webp')) {
                const webpPath = path.join(rawGenDir, f);
                const jpgPath = path.join(rawGenDir, f.replace(/\.webp$/i, '.jpg'));
                console.log(`  🔄 Converting ${f} to JPG...`);
                await sharp(webpPath).jpeg().toFile(jpgPath);
                // Windows locks the file, so we skip deleting it. It's ignored by the filter below anyway.
            }
        }

        // 3. Get all image files (blind — no mapping lookup)
        let files = fs.readdirSync(rawGenDir).filter(f => {
            const p = path.join(rawGenDir, f);
            if (!fs.statSync(p).isFile() || f.startsWith('.')) return false;
            const ext = path.extname(f).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.jfif', '.gif'].includes(ext);
        });

        if (limit && limit > 0) {
            files = files.slice(0, limit);
        }

        console.log(`\n🧐 Jones Real Vision Mode — processing ${files.length} images with Ollama ${OLLAMA_MODEL}...\n`);

        const results = {
            agent: this.name,
            mode: `Real Vision via Ollama ${OLLAMA_MODEL}`,
            timestamp: new Date().toISOString(),
            total_evaluated: files.length,
            selected_and_copied: 0,
            rejected_breakdown: { total: 0, underage_appearance: 0, AI_slop: 0, bad_quality: 0, not_following_world_rules: 0, parent: 0 },
            theme_breakdown: { MORNING: 0, MIDDAY: 0, PREP: 0, NIGHT: 0 },
            sfw_vs_nsfw: { SFW: 0, NSFW: 0 },
            rejected_files: [],
            approved_files: []
        };

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (processedHistory.includes(file)) {
                // Skip already processed file
                continue;
            }
            
            const srcPath = path.join(rawGenDir, file);
            if (!fs.existsSync(srcPath)) {
                continue;
            }
            process.stdout.write(`  [${i + 1}/${files.length}] Analyzing ${file}...`);

            const evalResult = await this.inspectImageWithVision(file, srcPath);
            const ext = path.extname(file).toLowerCase();

            if (evalResult.passed) {
                results.selected_and_copied++;
                results.theme_breakdown[evalResult.theme]++;
                results.sfw_vs_nsfw[evalResult.category]++;
                results.approved_files.push({
                    file, standardized: evalResult.standardized_name,
                    theme: evalResult.theme, quality: evalResult.quality_score,
                    sensuality: evalResult.sensuality_score, category: evalResult.category
                });
                const destDir = path.join(selectedDir, evalResult.theme);
                fs.copyFileSync(srcPath, path.join(destDir, evalResult.standardized_name));
                fs.writeFileSync(path.join(destDir, evalResult.sidecar_txt_name), evalResult.sidecar_content, 'utf8');
                console.log(` ✅ ${evalResult.theme} Q${evalResult.quality_score} ${evalResult.category}`);
            } else {
                results.rejected_breakdown.total++;
                const cat = evalResult.rejection_category;
                let targetDir = rejectedBaseDir;
                if (cat && rejSubfolders.includes(cat)) {
                    results.rejected_breakdown[cat]++;
                    targetDir = path.join(rejectedBaseDir, cat);
                } else {
                    results.rejected_breakdown.parent++;
                }
                results.rejected_files.push({
                    file, standardized: evalResult.standardized_name,
                    rejection_category: cat, quality: evalResult.quality_score,
                    sensuality: evalResult.sensuality_score, category: evalResult.category
                });
                fs.copyFileSync(srcPath, path.join(targetDir, evalResult.standardized_name));
                fs.writeFileSync(path.join(targetDir, evalResult.sidecar_txt_name), evalResult.sidecar_content, 'utf8');
                console.log(` ❌ ${cat || 'REJECTED'} Q${evalResult.quality_score}`);
            }
            
            // Mark file as processed and save history immediately
            processedHistory.push(file);
            fs.writeFileSync(historyPath, JSON.stringify(processedHistory, null, 2), 'utf8');
        }

        return results;
    }
    /**
     * Generate and cache a text description of Betty's appearance from her reference image.
     * Uses qwen2.5vl vision once; subsequent calls return the cached description.
     * Used by models that cannot accept a reference image (SD1.5, SDXL, Pony).
     */
    async generateBettyCharacterDescription(refImagePath, cachePath) {
        if (fs.existsSync(cachePath)) {
            const cached = fs.readFileSync(cachePath, 'utf8').trim();
            if (cached.length > 50) {
                console.log(`[Jones] ✅ Betty description loaded from cache: ${cachePath}`);
                return cached;
            }
        }

        console.log(`[Jones] 🔍 Generating Betty character description via qwen2.5vl...`);
        const descriptionPrompt = `You are a text-to-image prompt specialist. Analyze this reference image and write a precise, T2I-friendly physical description of the woman in this image. Focus ONLY on:
- Hair color, length, and style
- Face shape, features, and skin tone  
- Body type and approximate age
- Any visible clothing details

Write a concise paragraph of 3-4 sentences using comma-separated descriptive phrases suitable for direct insertion into a text-to-image prompt. Do NOT use "she" or "the woman" — write directly as descriptive tags like an artist would. Start directly with physical attributes.`;

        try {
            // qwen2.5vl runs with a 4096-token context in Ollama; the full-res ref image
            // (~4106 vision tokens) overflows it and Ollama answers HTTP 400. Downscale to
            // <=1024px (~1300 tokens worst case) before sending so the description succeeds.
            const downscaledPath = path.join(os.tmpdir(), 'betty_ref_downscaled_qwen.jpg');
            await sharp(refImagePath)
                .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 90 })
                .toFile(downscaledPath);

            const description = await this.callOllamaVision(downscaledPath, descriptionPrompt);
            const cleaned = description.trim();
            if (cleaned.length === 0) {
                throw new Error('qwen2.5vl returned an empty description');
            }
            fs.writeFileSync(cachePath, cleaned, 'utf8');
            console.log(`[Jones] ✅ Betty description generated and cached to: ${cachePath}`);
            return cleaned;
        } catch (err) {
            console.error(`[Jones] ⚠️ Failed to generate Betty description: ${err.message}`);
            // Fallback to the manual description from Betty Ryal_description.txt
            return `young blonde woman, model quality face, period-accurate loose undergown and light colored linen dress, messy hair, loose laces, naked shoulder visible, 18th century servant clothing, natural beauty, hyperrealistic photography`;
        }
    }
}

async function main() {
    const args = process.argv.slice(2);
    let customDir = null;
    let limit = null;

    if (args.includes('--source')) {
        const idx = args.indexOf('--source');
        customDir = args[idx + 1];
    }
    if (args.includes('--limit')) {
        const idx = args.indexOf('--limit');
        limit = parseInt(args[idx + 1], 10);
    }

    const jones = new JonesCensorAgent();
    console.log(`🧐 Jones — Real Vision Mode (Ollama ${OLLAMA_MODEL})`);
    if (customDir) console.log(`📁 Source Directory: ${customDir}`);
    if (limit) console.log(`🔢 Limit: ${limit} images`);
    console.log('================================================\n');
    try {
        const report = await jones.evaluateAndSortRawGenerations(customDir, limit);
        console.log('\n\n📊 FINAL REPORT:');
        console.log(JSON.stringify({
            total: report.total_evaluated,
            approved: report.selected_and_copied,
            rejected: report.rejected_breakdown,
            themes: report.theme_breakdown,
            sfw_nsfw: report.sfw_vs_nsfw
        }, null, 2));
    } catch (err) {
        console.error('Fatal error:', err.message);
    }
}

if (require.main === module) {
    main();
}

module.exports = JonesCensorAgent;
